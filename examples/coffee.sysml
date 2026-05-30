package CoffeeMachine {

    private import ScalarValues::*;

    action def BrewCoffee {
        attribute waterOk : Boolean;

        action grind;
        action checkWater;
        decide checkResult;
        action heat;
        action fill;
        action pour;

        succession first grind then checkWater;
        succession first checkWater then checkResult;
        first checkResult if waterOk then heat;
        first checkResult if not waterOk then fill;
        succession first fill then checkResult;
        succession first heat then pour;
    }

    action def Maintenance {
        action clean;
        action rinse;
        succession first clean then rinse;
    }

    part def Tank;
    attribute level : ScalarValues::Integer;
}
