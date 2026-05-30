package VehicleModel {

    part def Vehicle {
        attribute mass : ScalarValues::Real;
        part engine : Engine;
        part wheels : Wheel[4];
    }

    part def Engine {
        attribute power : ScalarValues::Real;
        part cylinders : Cylinder[1..12];
    }

    part def Cylinder;
    part def Wheel;

    part def Car :> Vehicle {
        attribute doors : ScalarValues::Integer;
    }

    part def Truck specializes Vehicle {
        attribute payload : ScalarValues::Real;
    }

    item def FuelTank {
        attribute capacity : ScalarValues::Real;
    }

    enum def GearMode {
        park;
        drive;
        reverse;
    }
}
