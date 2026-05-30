// State example: a simple media player state machine.
package MediaPlayer {

    state def Player {
        entry; then Stopped;

        state Stopped;
        state Playing;
        state Paused;

        transition first Stopped then Playing;
        transition first Playing then Paused;
        transition first Paused then Playing;
        transition first Playing then Stopped;
        transition first Paused then Stopped;
    }
}
