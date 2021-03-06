require('module-alias/register');
// Using chai
const {expect} = require('chai');
const helper = require('@utils/helpers');
const loginCommon = require('@commonTests/loginBO');
// Importing pages
const BOBasePage = require('@pages/BO/BObasePage');
const LoginPage = require('@pages/BO/login');
const DashboardPage = require('@pages/BO/dashboard');
const OrdersPage = require('@pages/BO/orders/index');
const HomePage = require('@pages/FO/home');
const FOLoginPage = require('@pages/FO/login');
const ProductPage = require('@pages/FO/product');
const CartPage = require('@pages/FO/cart');
const CheckoutPage = require('@pages/FO/checkout');
const OrderConfirmationPage = require('@pages/FO/orderConfirmation');
// Importing data
const {PaymentMethods} = require('@data/demo/paymentMethods');
const {DefaultAccount} = require('@data/demo/customer');
const {Statuses} = require('@data/demo/orderStatuses');
// Test context imports
const testContext = require('@utils/testContext');

const baseContext = 'functional_BO_orders_orders_bulkUpdateOrdersStatus';

let browser;
let page;

// Init objects needed
const init = async function () {
  return {
    boBasePage: new BOBasePage(page),
    loginPage: new LoginPage(page),
    dashboardPage: new DashboardPage(page),
    ordersPage: new OrdersPage(page),
    homePage: new HomePage(page),
    foLoginPage: new FOLoginPage(page),
    productPage: new ProductPage(page),
    cartPage: new CartPage(page),
    checkoutPage: new CheckoutPage(page),
    orderConfirmationPage: new OrderConfirmationPage(page),
  };
};

/*
Create 2 orders in FO
Go to BO and update orders created status by bulk actions
Check orders new status
 */
describe('Bulk update orders status', async () => {
  // before and after functions
  before(async function () {
    browser = await helper.createBrowser();
    page = await helper.newTab(browser);
    this.pageObjects = await init();
  });
  after(async () => {
    await helper.closeBrowser(browser);
  });

  describe('Create 2 orders in FO', async () => {
    it('should go to FO page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToFO', baseContext);
      await this.pageObjects.homePage.goToFo();
      await this.pageObjects.homePage.changeLanguage('en');
      const isHomePage = await this.pageObjects.homePage.isHomePage();
      await expect(isHomePage, 'Fail to open FO home page').to.be.true;
    });

    it('should go to login page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToLoginPageFO', baseContext);
      await this.pageObjects.homePage.goToLoginPage();
      const pageTitle = await this.pageObjects.foLoginPage.getPageTitle();
      await expect(pageTitle, 'Fail to open FO login page').to.contains(this.pageObjects.foLoginPage.pageTitle);
    });

    it('should sign in with default customer', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'sighInFO', baseContext);
      await this.pageObjects.foLoginPage.customerLogin(DefaultAccount);
      const isCustomerConnected = await this.pageObjects.foLoginPage.isCustomerConnected();
      await expect(isCustomerConnected, 'Customer is not connected').to.be.true;
    });

    ['first', 'second'].forEach((arg, index) => {
      it(`should create ${arg} order`, async function () {
        await testContext.addContextItem(this, 'testIdentifier', `createOrder${index + 1}`, baseContext);
        await this.pageObjects.foLoginPage.goToHomePage();
        // Go to the first product page
        await this.pageObjects.homePage.goToProductPage(1);
        // Add the created product to the cart
        await this.pageObjects.productPage.addProductToTheCart();
        // Proceed to checkout the shopping cart
        await this.pageObjects.cartPage.clickOnProceedToCheckout();
        // Address step - Go to delivery step
        const isStepAddressComplete = await this.pageObjects.checkoutPage.goToDeliveryStep();
        await expect(isStepAddressComplete, 'Step Address is not complete').to.be.true;
        // Delivery step - Go to payment step
        const isStepDeliveryComplete = await this.pageObjects.checkoutPage.goToPaymentStep();
        await expect(isStepDeliveryComplete, 'Step Address is not complete').to.be.true;
        // Payment step - Choose payment step
        await this.pageObjects.checkoutPage.choosePaymentAndOrder(PaymentMethods.wirePayment.moduleName);
        const cardTitle = await this.pageObjects.orderConfirmationPage.getOrderConfirmationCardTitle();
        // Check the confirmation message
        await expect(cardTitle).to.contains(this.pageObjects.orderConfirmationPage.orderConfirmationCardTitle);
      });
    });

    it('should sign out from FO', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'sighOutFO', baseContext);
      await this.pageObjects.orderConfirmationPage.logout();
      const isCustomerConnected = await this.pageObjects.orderConfirmationPage.isCustomerConnected();
      await expect(isCustomerConnected, 'Customer is connected').to.be.false;
    });
  });

  describe('Update orders status in BO', async () => {
    // Login into BO
    loginCommon.loginBO();

    it('should go to the orders page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToOrdersPage', baseContext);
      await this.pageObjects.boBasePage.goToSubMenu(
        this.pageObjects.boBasePage.ordersParentLink,
        this.pageObjects.boBasePage.ordersLink,
      );
      const pageTitle = await this.pageObjects.ordersPage.getPageTitle();
      await expect(pageTitle).to.contains(this.pageObjects.ordersPage.pageTitle);
    });

    it('should update orders status with bulk action', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'bulkUpdateOrdersStatus', baseContext);
      const textResult = await this.pageObjects.ordersPage.bulkUpdateOrdersStatus(
        Statuses.paymentAccepted.status,
        false,
        [1, 2],
      );
      await expect(textResult).to.equal(this.pageObjects.ordersPage.successfulUpdateMessage);
    });

    ['first', 'second'].forEach((arg, index) => {
      it(`should check ${arg} order status`, async function () {
        await testContext.addContextItem(this, 'testIdentifier', `checkOrderStatus${index + 1}`, baseContext);
        const orderStatus = await this.pageObjects.ordersPage.getTextColumn('osname', index + 1);
        await expect(orderStatus, 'Order status is not correct').to.equal(Statuses.paymentAccepted.status);
      });
    });
  });
});
