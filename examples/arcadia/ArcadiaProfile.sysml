// Reusable Arcadia stereotype library for SysML v2.
//
// Arcadia organizes a system across layers; here we expose the component and
// function "types" used by the colour code in arcadia.style.json. Specialize
// these in your own model (e.g. `part def Radio :> LogicalComponent;`) — the
// viewer follows the type hierarchy, so Radio is coloured as a LogicalComponent.
library package ArcadiaProfile {

    // --- Components (parts) ---
    part def OperationalEntity;   // Operational Analysis layer
    part def SystemComponent;     // System Analysis layer
    part def LogicalComponent;    // Logical Architecture layer
    part def PhysicalComponent;   // Physical Architecture layer
    part def PhysicalNode;        // Physical hosting node

    // --- Functions (actions) ---
    action def OperationalActivity;
    action def SystemFunction;
    action def LogicalFunction;
    action def PhysicalFunction;
}
