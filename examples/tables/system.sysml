// Demo model for tabular views. Right-click -> Celeris -> Show Table…
//   Presets: Requirements · Interfaces (ports / parts / flows) · Elements
//   Custom tables: see celeris.table.json (set the `celeris.tableConfig` setting to it).
package TabularDemo {

    // Engineering-level marker (used by the custom "Logical components" table).
    part def LogicalComponent;

    // ---- Requirements ----
    requirement def SafetyReq { doc /* The system shall be safe to operate. */ }
    requirement def LatencyReq :> SafetyReq {
        doc /* End-to-end latency shall stay under 100 ms. */
        subject sys : Controller;
    }
    requirement def AvailabilityReq { doc /* Availability shall be at least 99.9%. */ }

    // ---- Ports & interface ----
    port def DataPort;
    interface def DataLink { end a : DataPort; end b : DataPort; }

    part def Sensor     :> LogicalComponent { port data : DataPort; }
    part def Controller :> LogicalComponent { port sensorIn : DataPort; port cmdOut : DataPort; }
    part def Actuator   :> LogicalComponent { port cmd : DataPort; }

    // ---- Functions ----
    action def Acquire { out ref reading; }
    action def Control { in ref reading; out ref command; }

    // ---- System: parts, interfaces and the flows that traverse them ----
    part def System :> LogicalComponent {
        part sensor : Sensor;
        part controller : Controller;
        part actuator : Actuator;

        interface sensing   : DataLink connect sensor.data to controller.sensorIn;
        interface actuation : DataLink connect controller.cmdOut to actuator.cmd;

        flow from sensor.data to controller.sensorIn;
        flow from controller.cmdOut to actuator.cmd;
    }
}
