package TrafficLightSM {

    state def TrafficLight {
        entry; then Off;

        state Off;
        state Red;
        state Green;
        state Yellow;

        transition first Off then Red;
        transition first Red then Green;
        transition first Green then Yellow;
        transition first Yellow then Red;
    }
}
