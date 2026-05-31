// Reusable NAF v4 stereotype library for SysML v2.
//
// The NAF v4 grid organizes architecture by rows ("subjects of concern" / layers).
// These stereotypes expose those layers so the colour code in naf.style.json can
// tint elements by layer. Specialize them in your model, e.g.
// `part def Radar :> PhysicalResource;` — the viewer follows the type hierarchy.
library package NafProfile {

    // --- Architecture layers (NAF grid rows) ---
    part def ArchitectureFoundation;  // A  — foundation / meta-data
    part def Capability;              // C  — Concepts layer
    part def Service;                 // S  — Service layer
    part def LogicalNode;             // L  — Logical layer
    part def PhysicalResource;        // P  — Physical / Resource layer

    // --- Layer behaviours (functions / activities) ---
    action def OperationalActivity;   // logical-layer behaviour
    action def ServiceFunction;       // service-layer behaviour
}
