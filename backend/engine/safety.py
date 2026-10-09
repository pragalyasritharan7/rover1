"""Safety and return guarantee module.

Evaluates return-safety condition each step:
  energy_remaining >= cost_to_nearest_comm_zone + safety_margin
Forcing the rover into RETURNING mode before it becomes stranded.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Tuple
from backend.engine.environment import Environment
from backend.engine.pathfinding import a_star
from backend.engine.rover import Rover
from backend.engine.sensing import SensingManager


@dataclass
class SafetyAssessment:
    is_safe: bool
    return_cost: int
    nearest_comm_zone: Optional[Tuple[int, int]]
    return_path: Optional[List[Tuple[int, int]]]
    safety_margin: int
    buffer_remaining: int
    reason: str
    is_known_safe: bool = True


def evaluate_return_safety(
    rover: Rover,
    sensing: SensingManager,
    environment: Environment,
    safety_margin: int = 5,
) -> SafetyAssessment:
    """Evaluates whether current rover energy is sufficient to guarantee safe return.

    A route is guaranteed known-safe ONLY if it traverses strictly known passable terrain.
    Routes crossing unknown cells are treated as uncertain (is_known_safe = False, is_safe = False).
    Includes action costs (such as upload cost if carrying data) in return cost calculations.
    """
    comm_candidates = list(sensing.known_comm_zones)
    if not comm_candidates:
        # Guarantee fallback to known start position (which is always a comm zone)
        comm_candidates = [environment.start_pos]

    # Action cost required upon returning (e.g. upload cost if carrying data)
    action_cost = rover.config.upload_cost if rover.data_carried > 0 else 0

    known_cost = 999999
    known_path: Optional[List[Tuple[int, int]]] = None
    known_comm: Optional[Tuple[int, int]] = None

    # First attempt: find path strictly through known passable terrain
    for comm in comm_candidates:
        path, cost = a_star(
            start=rover.pos,
            goal=comm,
            known_map=sensing.known_map,
            allow_unknown=False,
            move_open_cost=rover.config.move_open_cost,
            move_hazard_cost=rover.config.move_hazard_cost,
        )
        if path is not None and cost < known_cost:
            known_cost = cost
            known_path = path
            known_comm = comm

    if known_path is not None and known_comm is not None:
        total_return_cost = known_cost + action_cost
        buffer_remaining = rover.energy - (total_return_cost + safety_margin)
        is_safe = buffer_remaining > 0

        reason = (
            f"Known safe: energy {rover.energy} > return cost {total_return_cost} + margin {safety_margin} (buffer: {buffer_remaining})"
            if is_safe
            else f"Returning forced: energy {rover.energy} <= return cost {total_return_cost} + margin {safety_margin}"
        )

        return SafetyAssessment(
            is_safe=is_safe,
            return_cost=total_return_cost,
            nearest_comm_zone=known_comm,
            return_path=known_path,
            safety_margin=safety_margin,
            buffer_remaining=buffer_remaining,
            reason=reason,
            is_known_safe=True,
        )

    # Fallback attempt: if no pure known path exists, estimate path allowing traversal of unknown cells
    est_cost = 999999
    est_path: Optional[List[Tuple[int, int]]] = None
    est_comm: Optional[Tuple[int, int]] = None

    for comm in comm_candidates:
        path, cost = a_star(
            start=rover.pos,
            goal=comm,
            known_map=sensing.known_map,
            allow_unknown=True,
            move_open_cost=rover.config.move_open_cost,
            move_hazard_cost=rover.config.move_hazard_cost,
            unknown_penalty=rover.config.move_open_cost * 2,
        )
        if path is not None and cost < est_cost:
            est_cost = cost
            est_path = path
            est_comm = comm

    if est_comm is None or est_path is None:
        # Trapped with no feasible path
        return SafetyAssessment(
            is_safe=False,
            return_cost=999999,
            nearest_comm_zone=None,
            return_path=None,
            safety_margin=safety_margin,
            buffer_remaining=-999999,
            reason="No passable route to any communication zone (known or unknown).",
            is_known_safe=False,
        )

    total_est_cost = est_cost + action_cost
    buffer_remaining = rover.energy - (total_est_cost + safety_margin)

    # Uncertain route is NEVER reported as guaranteed safe (is_safe = False)
    return SafetyAssessment(
        is_safe=False,
        return_cost=total_est_cost,
        nearest_comm_zone=est_comm,
        return_path=est_path,
        safety_margin=safety_margin,
        buffer_remaining=buffer_remaining,
        reason=f"Uncertain route across unknown terrain: estimated cost {total_est_cost}, not guaranteed safe.",
        is_known_safe=False,
    )
