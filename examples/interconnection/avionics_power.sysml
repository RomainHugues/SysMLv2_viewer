// Interconnection (Internal Block Diagram) — STRUCTURE.
//
// View as an Interconnection diagram (right-click -> Celeris -> Show
// Interconnection Diagram): each `part` is a block, its `port`s sit on the block,
// and `connect` / `interface` wire the ports together. A typed `interface` is
// drawn as a bold (purple) connector, a plain `connect` as a thin line.
package AvionicsPower {

    port def PowerPort;
    port def DataPort;

    interface def PowerLink {
        end source : PowerPort;
        end sink : PowerPort;
    }

    part def Battery { port power : PowerPort; }
    part def PowerBus { port feed : PowerPort; port tapA : PowerPort; port tapB : PowerPort; }
    part def FlightComputer { port power : PowerPort; port sensorIn : DataPort; }
    part def IMU { port data : DataPort; port power : PowerPort; }
    part def GPS { port data : DataPort; }

    part def Avionics {
        part battery : Battery;
        part bus : PowerBus;
        part fc : FlightComputer;
        part imu : IMU;
        part gps : GPS;

        // power distribution
        interface supply : PowerLink connect battery.power to bus.feed;
        connect bus.tapA to fc.power;
        connect bus.tapB to imu.power;

        // data
        connect imu.data to fc.sensorIn;
        connect gps.data to fc.sensorIn;
    }
}
