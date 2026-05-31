// NAF v4 styled example: a small Command & Control architecture spanning the
// NAF grid layers. View as a Class diagram with the NAF style file selected
// (SysML Mermaid: Select Style File… -> examples/naf/naf.style.json):
//   Capability -> purple, Service -> blue, Logical -> green, Physical -> orange.
package C2System {
    private import NafProfile::*;

    // --- Concepts layer: capabilities (purple) ---
    part def SituationalAwareness :> Capability;
    part def CommandAndControl :> Capability;

    // --- Service layer (blue) ---
    part def TrackingService :> Service;
    part def MessagingService :> Service;

    // --- Logical layer (green) ---
    part def SensorNode :> LogicalNode;
    part def CommandPost :> LogicalNode;

    // --- Physical / Resource layer (orange) ---
    part def Radar :> PhysicalResource;
    part def Server :> PhysicalResource;

    // --- Architecture assembly ---
    part c2 : CommandAndControl {
        part awareness : SituationalAwareness;
    }
    part tracking : TrackingService;
    part messaging : MessagingService;
    part post : CommandPost {
        part sensors : SensorNode[*];
    }
    part radar : Radar;
    part server : Server;
}
