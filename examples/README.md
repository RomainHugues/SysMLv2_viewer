# Examples

Sample SysML v2 models, one column per diagram type. Open a file, put the cursor
inside the package, then right-click → **SysML Diagram → Show … Diagram**.

| File | Package | Best viewed as | Illustrates |
| --- | --- | --- | --- |
| [coffee.sysml](coffee.sysml) | `CoffeeMachine` | Flowchart | actions, a decision, guarded branches, a loop |
| [order_fulfillment.sysml](order_fulfillment.sysml) | `OrderFulfillment` | Flowchart | parallel actions with `fork` / `join` |
| [approval_workflow.sysml](approval_workflow.sysml) | `ApprovalWorkflow` | Flowchart | a decision with guards and a `merge` |
| [vehicle.sysml](vehicle.sysml) | `VehicleModel` | Class | parts, attributes, inheritance, composition, item & enum defs |
| [library.sysml](library.sysml) | `LibrarySystem` | Class | composition, references (associations), multiplicities |
| [robot.sysml](robot.sysml) | `RobotSystem` | Class | ports and a small part hierarchy |
| [traffic_light.sysml](traffic_light.sysml) | `TrafficLightSM` | State | states, transitions, initial pseudostate |
| [door_lock.sysml](door_lock.sysml) | `DoorLock` | State | a transition with a guard |
| [media_player.sysml](media_player.sysml) | `MediaPlayer` | State | a simple player state machine |
| [order_protocol.sysml](order_protocol.sysml) | `OrderProtocol` | Sequence | participants and directed flow messages |
| [auth_handshake.sysml](auth_handshake.sysml) | `AuthHandshake` | Sequence | an authentication handshake |
| [atm_withdrawal.sysml](atm_withdrawal.sysml) | `AtmWithdrawal` | Sequence | an ATM withdrawal message flow |
| [vehicle_requirements.sysml](vehicle_requirements.sysml) | `VehicleRequirements` | Requirement | requirement defs, subject, derivation, decomposition and satisfy |

> Note: attribute types such as `Real`, `String`, `Boolean` come from the SysML
> standard library. Without that library configured they show as "unresolved" in
> the editor, but this has no effect on the generated diagrams (the type name is
> still displayed).
