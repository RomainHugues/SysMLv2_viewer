// Class example: ports and a small part hierarchy.
package RobotSystem {

    port def PowerPort;

    part def Battery {
        port supply : PowerPort;
        attribute charge : Real;
    }

    part def Motor {
        port intake : PowerPort;
        attribute torque : Real;
    }

    part def Robot {
        part battery : Battery;
        part motors : Motor[2];
    }
}
