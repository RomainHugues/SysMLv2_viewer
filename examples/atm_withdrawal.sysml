// Sequence example: ATM cash withdrawal message flow.
package AtmWithdrawal {

    part def User;
    part def ATM;
    part def Bank;

    part user : User;
    part atm : ATM;
    part bank : Bank;

    flow insertCard from user to atm;
    flow requestPin from atm to user;
    flow enterPin from user to atm;
    flow verifyPin from atm to bank;
    flow approved from bank to atm;
    flow dispenseCash from atm to user;
}
