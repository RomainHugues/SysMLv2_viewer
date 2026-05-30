package OrderProtocol {

    part def Customer;
    part def Shop;
    part def Warehouse;

    part customer : Customer;
    part shop : Shop;
    part warehouse : Warehouse;

    flow placeOrder from customer to shop;
    flow checkStock from shop to warehouse;
    flow stockOk from warehouse to shop;
    flow confirm from shop to customer;
}
