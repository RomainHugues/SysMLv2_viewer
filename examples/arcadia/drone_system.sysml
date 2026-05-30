// Arcadia-styled example: a small drone surveillance system.
// View as a Class diagram with sysmlMermaid.styleFile pointing at
// examples/arcadia/arcadia.style.json to get the Arcadia colour code:
//   LogicalComponent -> blue, PhysicalNode -> yellow, OperationalEntity -> orange,
//   functions (actions) -> green.
package DroneSystem {
    private import ArcadiaProfile::*;

    // --- Operational entities (orange) ---
    part def Operator :> OperationalEntity;
    part def AirspaceAuthority :> OperationalEntity;

    // --- Logical components (blue) ---
    part def FlightController :> LogicalComponent {
        part navigation : NavigationUnit;
        part comms : CommsUnit;
    }
    part def NavigationUnit :> LogicalComponent;
    part def CommsUnit :> LogicalComponent;
    part def Camera :> LogicalComponent;

    // --- Physical nodes (yellow) ---
    part def OnboardComputer :> PhysicalNode;
    part def GroundStation :> PhysicalNode;

    // --- Logical functions (green) ---
    action def Stabilize :> LogicalFunction;
    action def StreamVideo :> LogicalFunction;

    // --- System assembly ---
    part drone : FlightController {
        part eye : Camera;
    }
    part computer : OnboardComputer;
    part ground : GroundStation;
    part pilot : Operator;
}
