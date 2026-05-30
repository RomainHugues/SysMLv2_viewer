// Flowchart example: parallel actions with fork / join.
package OrderFulfillment {

    action def FulfillOrder {
        action receiveOrder;
        fork split;
        action pickItems;
        action prepareInvoice;
        join sync;
        action ship;

        succession first receiveOrder then split;
        succession first split then pickItems;
        succession first split then prepareInvoice;
        succession first pickItems then sync;
        succession first prepareInvoice then sync;
        succession first sync then ship;
    }
}
