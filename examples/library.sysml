// Class example: composition, references (associations) and inheritance.
package LibrarySystem {

    private import ScalarValues::*;

    part def Library {
        part catalog : Book[*];
        part members : Member[*];
    }

    part def Book {
        attribute title : String;
        attribute isbn : String;
    }

    part def Member {
        attribute name : String;
        ref loans : Loan[*];
    }

    item def Loan {
        attribute dueDate : String;
        ref book : Book;
        ref borrower : Member;
    }

    part def ReferenceBook :> Book;
}
