// Realization view — traceability of how elements at one engineering level are
// realized by elements at another (Arcadia-style layers).
//
// View as a Realization diagram (right-click -> Celeris -> Show Realization
// Diagram): elements are placed in lanes by their level (an element sets its
// level by specializing a level marker type, e.g. `:> LogicalComponent`), and
// `dependency realize` / `dependency trace` links are drawn across the lanes.
package CrossLevelRealization {

    // --- engineering-level marker types (Arcadia layers) ---
    part def OperationalEntity;
    action def OperationalActivity;
    action def SystemFunction;
    part def LogicalComponent;
    action def LogicalFunction;
    part def PhysicalNode;

    // --- Operational ---
    part def Operator :> OperationalEntity;
    action def ConductSurveillance :> OperationalActivity;

    // --- System ---
    action def DetectIntrusion :> SystemFunction;
    action def ReportStatus :> SystemFunction;

    // --- Logical ---
    part def FlightController :> LogicalComponent;
    part def Camera :> LogicalComponent;
    action def TrackTarget :> LogicalFunction;

    // --- Physical ---
    part def OnboardComputer :> PhysicalNode;
    part def GroundStation :> PhysicalNode;

    // --- Realization / traceability across levels (lower realizes higher) ---
    // Plain `dependency` links are the realization edges; a named dependency
    // (e.g. `trace`) is shown with its name as the edge label.
    dependency from DetectIntrusion to ConductSurveillance;  // System  -> Operational
    dependency from ReportStatus to ConductSurveillance;     // System  -> Operational
    dependency from TrackTarget to DetectIntrusion;          // Logical -> System
    dependency from FlightController to DetectIntrusion;     // Logical -> System
    dependency from Camera to TrackTarget;                   // Logical -> Logical
    dependency from OnboardComputer to FlightController;     // Physical -> Logical
    dependency from GroundStation to Camera;                 // Physical -> Logical
    dependency trace from FlightController to Operator;      // trace   -> Operational
}
