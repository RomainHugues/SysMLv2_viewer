package VehicleRequirements {
    private import ScalarValues::*;

    part def Vehicle;
    part def Brakes;

    requirement def RegulatoryReq {
        doc /* Comply with applicable road-safety regulations. */
    }

    requirement def SafetyRequirement {
        doc /* The vehicle shall be safe to operate. */
    }

    requirement def MassLimit {
        doc /* The vehicle mass shall not exceed the limit. */
        attribute maxMass : Real;
    }

    requirement def BrakingDistance :> SafetyRequirement {
        doc /* Braking distance shall stay within bounds. */
    }

    requirement def VehicleSpecification {
        doc /* Top-level vehicle specification. */
        subject vehicle : Vehicle;
        requirement massReq : MassLimit;
        requirement brakeReq : BrakingDistance;
    }

    // trace: the mass limit traces to a regulatory requirement
    dependency from MassLimit to RegulatoryReq;

    part brakes : Brakes {
        satisfy BrakingDistance;
    }
}
