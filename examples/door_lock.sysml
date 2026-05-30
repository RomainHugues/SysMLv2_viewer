// State example: transitions with a guard.
package DoorLock {

    private import ScalarValues::*;

    state def Door {
        attribute hasKey : Boolean;
        attribute unexpectedEvent : Boolean;

        entry; then Closed;

        state Closed;
        state Open;
        state Locked;
        state Broken;

        transition first Closed then Open;
        transition first Open then Closed;
        transition first Closed then Locked;
        transition first Locked if hasKey then Closed;
        transition first Open if unexpectedEvent then Broken;
        transition first Closed if unexpectedEvent then Broken;
        transition first Locked if unexpectedEvent then Broken;

    }
}
