// Functional architecture with 3 functional chains (Capella-style).
// View as a Flowchart (right-click -> Celeris -> Show Flowchart Diagram):
//   Engagement, Reporting and Archival each run through several functions; the
//   `identify` function is shared by all three (dark border).
//
// Chains are modelled the SysML v2 way: each chain is a `use case` that
// `perform`s the functions it traverses. A function performed by several use
// cases is the one shared by several chains. The `part`s are the performers:
// the components that perform (realise) each function.
package SurveillanceArchitecture {

    // ---- Functional architecture: the functions and the flows between them ----
    action MissionThread {
        action sense;
        action detect;
        action identify;
        action engage;
        action report;
        action archive;

        // Functional exchanges
        succession first sense then identify;
        succession first detect then identify;
        succession first identify then engage;
        succession first identify then report;
        succession first identify then archive;
    }

    // ---- Functional chains: each chain is a use case performing its functions ----
    use case def Engagement {
        perform MissionThread.detect;
        perform MissionThread.identify;
        perform MissionThread.engage;
    }
    use case def Reporting {
        perform MissionThread.sense;
        perform MissionThread.identify;
        perform MissionThread.report;
    }
    use case def Archival {
        perform MissionThread.identify;
        perform MissionThread.archive;
    }

    // ---- Performers: the components that perform (realise) each function ----
    part def Sensor;
    part def Tracker;
    part def Effector;
    part def Comms;
    part def Recorder;

    part sensor : Sensor {
        perform MissionThread.sense;
        perform MissionThread.detect;
    }
    part tracker : Tracker {
        perform MissionThread.identify;
    }
    part effector : Effector {
        perform MissionThread.engage;
    }
    part comms : Comms {
        perform MissionThread.report;
    }
    part recorder : Recorder {
        perform MissionThread.archive;
    }
}
