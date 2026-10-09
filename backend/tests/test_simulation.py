"""Unit tests for simulation determinism, obstacle avoidance, and mission state transitions."""

import pytest
from backend.engine.environment import CellType
from backend.engine.simulation import Simulation, SimulationConfig


def test_simulation_determinism():
    """Two simulations initialized with the identical seed and config must produce identical results."""
    cfg1 = SimulationConfig(seed=1337, strategy="frontier", width=20, height=20, max_energy=150)
    cfg2 = SimulationConfig(seed=1337, strategy="frontier", width=20, height=20, max_energy=150)

    sim1 = Simulation(cfg1)
    sim2 = Simulation(cfg2)

    snaps1, metrics1 = sim1.run_to_completion()
    snaps2, metrics2 = sim2.run_to_completion()

    assert len(snaps1) == len(snaps2)
    assert metrics1.steps == metrics2.steps
    assert metrics1.data_uploaded == metrics2.data_uploaded
    assert metrics1.energy_used == metrics2.energy_used
    assert metrics1.mission_outcome == metrics2.mission_outcome

    # Verify every rover position matches identically
    for s1, s2 in zip(snaps1, snaps2):
        assert s1["rover"]["pos"] == s2["rover"]["pos"]
        assert s1["rover"]["energy"] == s2["rover"]["energy"]
        assert s1["rover"]["mode"] == s2["rover"]["mode"]


def test_rover_never_moves_into_obstacles():
    """Ensure rover never steps into an obstacle during movement."""
    # Test on map without dynamic blocking to check trail against static terrain
    cfg = SimulationConfig(seed=42, strategy="greedy", width=25, height=25, block_rate=0.0)
    sim = Simulation(cfg)
    snaps, metrics = sim.run_to_completion()

    for x, y in sim.rover.trail:
        cell = sim.environment.get_cell(x, y)
        assert cell != CellType.OBSTACLE, f"Rover entered obstacle at ({x}, {y})!"

    # Also test with active dynamic blocking: step-by-step verification
    cfg2 = SimulationConfig(seed=99, strategy="risk_aware", width=25, height=25, block_rate=0.1)
    sim2 = Simulation(cfg2)
    sim2.get_snapshot(full_map=True)
    while not sim2.rover.is_terminal() and sim2.step_count < 100:
        sim2.step()
        curr_cell = sim2.environment.get_cell(sim2.rover.x, sim2.rover.y)
        assert curr_cell != CellType.OBSTACLE, f"Rover moved onto obstacle at {sim2.rover.pos}!"


def test_data_upload_transfers_carried_data():
    """Carried data must become uploaded data when rover reaches a comm zone."""
    cfg = SimulationConfig(seed=77, strategy="value_aware", width=22, height=22, max_energy=250)
    sim = Simulation(cfg)
    snaps, metrics = sim.run_to_completion()

    if metrics.data_collected > 0 and metrics.mission_outcome == "SUCCESS":
        assert metrics.data_uploaded > 0
        assert sim.rover.data_carried == 0


def test_movement_affordability_insufficient_energy():
    """Movement attempted with insufficient energy must not move rover or deduct energy."""
    from backend.engine.rover import Rover, RoverConfig
    rover = Rover(start_pos=(1, 1), config=RoverConfig(max_energy=10, move_hazard_cost=4))
    rover.energy = 3  # Remaining energy is 3, cost into hazard is 4
    cost_paid = rover.move_to(1, 2, CellType.HAZARD)

    assert cost_paid == 0
    assert rover.pos == (1, 1)
    assert rover.energy == 3
    assert rover.trail == [(1, 1)]


def test_step_limit_terminates_as_incomplete():
    """Ending at step limit without finishing objectives or losing energy must report INCOMPLETE."""
    cfg = SimulationConfig(seed=42, strategy="greedy", width=25, height=25, max_energy=500)
    sim = Simulation(cfg)
    snaps, metrics = sim.run_to_completion(max_steps=5)

    assert metrics.mission_outcome == "INCOMPLETE"
    assert sim.rover.mode.value == "INCOMPLETE"


def test_snapshot_immutability():
    """Later environment modifications must not alter earlier snapshot payloads."""
    cfg = SimulationConfig(seed=42, width=20, height=20)
    sim = Simulation(cfg)
    snap0 = sim.get_snapshot(full_map=True)

    original_val = snap0["true_map"][1][1]
    # Mutate environment grid directly
    sim.environment.grid[1][1] = 99

    assert snap0["true_map"][1][1] == original_val
    assert snap0["true_map"][1][1] != 99


def test_state_machine_not_stuck_in_collecting():
    """Rover mode must reset to EXPLORING after leaving collection cell."""
    cfg = SimulationConfig(seed=42, strategy="greedy", width=20, height=20)
    sim = Simulation(cfg)
    snaps, _ = sim.run_to_completion(max_steps=100)

    collect_idx = [i for i, s in enumerate(snaps) if s["rover"]["mode"] == "COLLECTING"]
    if collect_idx:
        idx = collect_idx[0]
        # Check subsequent step where rover resumed movement
        if idx + 2 < len(snaps):
            next_mode = snaps[idx + 2]["rover"]["mode"]
            assert next_mode in ("EXPLORING", "RETURNING", "SUCCESS", "UPLOADING")
