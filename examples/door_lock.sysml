// State example: transitions with a guard.
package DoorLock {

    state def Door {
        attribute hasKey : Boolean;

        entry; then Closed;

        state Closed;
        state Open;
        state Locked;

        transition first Closed then Open;
        transition first Open then Closed;
        transition first Closed then Locked;
        transition first Locked if hasKey then Closed;
    }
}
