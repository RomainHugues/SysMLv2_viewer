// Component / Product Breakdown Structure (PBS) — a decomposition tree of components.
//
// View as a Class diagram (right-click -> Celeris -> Show Class Diagram): the
// class diagram is the SysML Block Definition Diagram (BDD). Each component is a
// `part def`; a component is decomposed into sub-components via typed `part`
// usages, which the BDD draws as composition (whole-part). The result is a
// top-down breakdown tree of the drone's components.
package ComponentBreakdown {

    part def Drone {
        part airframe : Airframe;
        part propulsion : Propulsion;
        part avionics : Avionics;
    }

    part def Propulsion {
        part motor : Motor;
        part battery : Battery;
        part propeller : Propeller;
    }

    part def Avionics {
        part flightComputer : FlightComputer;
        part imu : IMU;
        part gps : GPS;
    }

    // leaf components (not decomposed further)
    part def Airframe;
    part def Motor;
    part def Battery;
    part def Propeller;
    part def FlightComputer;
    part def IMU;
    part def GPS;
}
