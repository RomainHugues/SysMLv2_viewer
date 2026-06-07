// Gantt (schedule) view. Right-click -> Celeris -> Show Gantt Diagram.
//   Activities = actions; dependencies = successions. Each action carries planning
//   attributes: `duration` (days) sets the bar length, `resource` sets its colour
//   (one colour per resource, grouped into sections). The critical path — the chain
//   that determines the total duration — is outlined in red.
package MissionSchedule {

    action def Mission {
        action acquire   { attribute duration = 2; attribute resource = "Sensor"; }
        action filtering { attribute duration = 3; attribute resource = "CPU"; }
        action detect    { attribute duration = 2; attribute resource = "CPU"; }
        action classify  { attribute duration = 4; attribute resource = "GPU"; }
        action assess    { attribute duration = 1; attribute resource = "CPU"; }
        action engage    { attribute duration = 3; attribute resource = "Effector"; }
        action report    { attribute duration = 2; attribute resource = "Comms"; }

        succession first acquire then filtering;
        succession first filtering then detect;
        succession first detect then classify;
        succession first detect then assess;
        succession first classify then engage;
        succession first assess then engage;
        succession first engage then report;
    }
}
