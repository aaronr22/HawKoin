/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * HawKoin Unit Tests
 */

const AdminConnection = require('composer-admin').AdminConnection;
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const { BusinessNetworkDefinition, CertificateUtil, IdCard } = require('composer-common');
const path = require('path');

const chai = require('chai');
chai.should();
chai.use(require('chai-as-promised'));

const namespace = 'org.hawkoin.network';

const genericUserType = 'User';
const genericUserNS = namespace + '.' + genericUserType;

const administratorType = 'Administrator';
const administratorNS = namespace + '.' + administratorType;

const facultyType = 'Faculty';
const facultyNS = namespace + '.' + facultyType;

const vendorType = 'Vendor';
const vendorNS = namespace + '.' + vendorType;

const studentType = 'Student';
const studentNS = namespace + '.' + studentType;

const demoModeType = 'DemoMode';
const demoModeNS = namespace + '.' + demoModeType;

describe('#' + namespace, () => {
    // In-memory card store for testing so cards are not persisted to the file system
    const cardStore = require('composer-common').NetworkCardStoreManager.getCardStore( { type: 'composer-wallet-inmemory' } );

    // Embedded connection used for local testing
    const connectionProfile = {
        name: 'embedded',
        'x-type': 'embedded'
    };

    // Name of the business network card containing the administrative identity for the business network
    const adminCardName = 'admin';

    // Admin connection to the blockchain, used to deploy the business network
    let adminConnection;

    // This is the business network connection the tests will use.
    let businessNetworkConnection;

    // This is the factory for creating instances of types.
    let factory;

    //These are the identities for two of each type of participant.
    const administrator1CardName = 'administrator1';
    const administrator2CardName = 'administrator2';
    const faculty1CardName = 'faculty1';
    const faculty2CardName = 'faculty2';
    const vendor1CardName = 'vendor1';
    const vendor2CardName = 'vendor2';
    const vendorInnactiveCardName = 'vendorInnactive';
    const student1CardName = 'student1';
    const student2CardName = 'student2';
    const studentInnactiveCardName = 'studentInnactive';

    var administratorRegistry;
    var facultyRegistry;
    var vendorRegistry;
    var studentRegistry;
    var demoModeRegistry;

    // These are a list of received events.
    let events;
    let businessNetworkName;

    before(async () => {
        // Generate certificates for use with the embedded connection
        const credentials = CertificateUtil.generate({ commonName: 'admin' });

        // Identity used with the admin connection to deploy business networks
        const deployerMetadata = {
            version: 1,
            userName: 'PeerAdmin',
            roles: [ 'PeerAdmin', 'ChannelAdmin' ]
        };
        const deployerCard = new IdCard(deployerMetadata, connectionProfile);
        deployerCard.setCredentials(credentials);
        const deployerCardName = 'PeerAdmin';

        adminConnection = new AdminConnection({ cardStore: cardStore });

        await adminConnection.importCard(deployerCardName, deployerCard);
        await adminConnection.connect(deployerCardName);
    });

    /**
     *
     * @param {String} cardName The card name to use for this identity
     * @param {Object} identity The identity details
     */
    async function importCardForIdentity(cardName, identity) {
        const metadata = {
            userName: identity.userID,
            version: 1,
            enrollmentSecret: identity.userSecret,
            businessNetwork: businessNetworkName
        };
        const card = new IdCard(metadata, connectionProfile);
        await adminConnection.importCard(cardName, card);
    }

    // This is called before each test is executed.
    beforeEach(async () => {
        // Generate a business network definition from the project directory.
        let businessNetworkDefinition = await BusinessNetworkDefinition.fromDirectory(path.resolve(__dirname, '..'));
        businessNetworkName = businessNetworkDefinition.getName();
        await adminConnection.install(businessNetworkDefinition);
        const startOptions = {
            networkAdmins: [
                {
                    userName: 'admin',
                    enrollmentSecret: 'adminpw'
                }
            ]
        };
        const adminCards = await adminConnection.start(businessNetworkName, businessNetworkDefinition.getVersion(), startOptions);
        await adminConnection.importCard(adminCardName, adminCards.get('admin'));

        // Create and establish a business network connection
        businessNetworkConnection = new BusinessNetworkConnection({ cardStore: cardStore });
        events = [];
        businessNetworkConnection.on('event', event => {
            events.push(event);
        });
        await businessNetworkConnection.connect(adminCardName);

        // Get the factory for the business network.
        factory = businessNetworkConnection.getBusinessNetwork().getFactory();

        // Create the participants.
        administratorRegistry = await businessNetworkConnection.getParticipantRegistry(administratorNS);
        facultyRegistry = await businessNetworkConnection.getParticipantRegistry(facultyNS);
        vendorRegistry = await businessNetworkConnection.getParticipantRegistry(vendorNS);
        studentRegistry = await businessNetworkConnection.getParticipantRegistry(studentNS);
        demoModeRegistry = await businessNetworkConnection.getAssetRegistry(demoModeNS);

        //We can leave contact info empty for now since it doesn't play a role in txns. Can auto-gen this in future.
        const emptyContactInfo = factory.newConcept(namespace, 'ContactInfo');
        emptyContactInfo.firstName = ' ';
        emptyContactInfo.lastName = ' ';
        emptyContactInfo.email = ' ';
        emptyContactInfo.address = ' ';
        emptyContactInfo.city = ' ';
        emptyContactInfo.state = ' ';
        emptyContactInfo.zip = ' ';

        const administrator1 = factory.newResource(namespace,administratorType, 'administrator1');
        administrator1.balance = 100.00;
        administrator1.isActive = true;
        administrator1.accessLevel = 'ADMIN';
        administrator1.lowBalThreshold = 5.00;
        administrator1.txnThreshold = 100.00;
        administrator1.contactInfo = emptyContactInfo;

        const administrator2 = factory.newResource(namespace,administratorType, 'administrator2');
        administrator2.balance = 100.00;
        administrator2.isActive = true;
        administrator2.accessLevel = 'ADMIN';
        administrator2.lowBalThreshold = 5.00;
        administrator2.txnThreshold = 100.00;
        administrator2.contactInfo = emptyContactInfo;

        const faculty1 = factory.newResource(namespace,facultyType, 'faculty1');
        faculty1.dept = 'CS';
        faculty1.balance = 100.00;
        faculty1.isActive = true;
        faculty1.accessLevel = 'FACULTY';
        faculty1.lowBalThreshold = 5.00;
        faculty1.txnThreshold = 100.00;
        faculty1.contactInfo = emptyContactInfo;

        const faculty2 = factory.newResource(namespace,facultyType, 'faculty2');
        faculty2.dept = 'CS';
        faculty2.balance = 100.00;
        faculty2.isActive = true;
        faculty2.accessLevel = 'FACULTY';
        faculty2.lowBalThreshold = 5.00;
        faculty2.txnThreshold = 100.00;
        faculty2.contactInfo = emptyContactInfo;

        const vendor1 = factory.newResource(namespace, vendorType, 'vendor1');
        vendor1.vendorName = 'Vendor1';
        vendor1.ccr = 'MONTHLY';
        vendor1.balance = 100.00;
        vendor1.isActive = true;
        vendor1.accessLevel = 'VENDOR';
        vendor1.lowBalThreshold = 5.00;
        vendor1.txnThreshold = 100.00;
        vendor1.contactInfo = emptyContactInfo;

        const vendor2 = factory.newResource(namespace, vendorType, 'vendor2');
        vendor2.vendorName = 'Vendor2';
        vendor2.ccr = 'MONTHLY';
        vendor2.balance = 100.00;
        vendor2.isActive = true;
        vendor2.accessLevel = 'VENDOR';
        vendor2.lowBalThreshold = 5.00;
        vendor2.txnThreshold = 100.00;
        vendor2.contactInfo = emptyContactInfo;

        const vendorInnactive = factory.newResource(namespace, vendorType, 'vendorInnactive');
        vendorInnactive.vendorName = 'InnactiveVendor';
        vendorInnactive.ccr = 'MONTHLY';
        vendorInnactive.balance = 100.00;
        vendorInnactive.isActive = false;
        vendorInnactive.accessLevel = 'VENDOR';
        vendorInnactive.lowBalThreshold = 5.00;
        vendorInnactive.txnThreshold = 100.00;
        vendorInnactive.contactInfo = emptyContactInfo;

        const student1 = factory.newResource(namespace, studentType, 'student1');
        student1.isAthlete = false;
        student1.major = 'CSB';
        student1.balance = 100.00;
        student1.isActive = true;
        student1.accessLevel = 'STUDENT';
        student1.lowBalThreshold = 5.00;
        student1.txnThreshold = 100.00;
        student1.contactInfo = emptyContactInfo;

        const student2 = factory.newResource(namespace, studentType, 'student2');
        student2.isAthlete = false;
        student2.major = 'CSB';
        student2.balance = 100.00;
        student2.isActive = true;
        student2.accessLevel = 'STUDENT';
        student2.lowBalThreshold = 5.00;
        student2.txnThreshold = 100.00;
        student2.contactInfo = emptyContactInfo;

        const studentInnactive = factory.newResource(namespace, studentType, 'studentInnactive');
        studentInnactive.isAthlete = false;
        studentInnactive.major = 'CSB';
        studentInnactive.balance = 100.00;
        studentInnactive.isActive = false;
        studentInnactive.accessLevel = 'STUDENT';
        studentInnactive.lowBalThreshold = 5.00;
        studentInnactive.txnThreshold = 100.00;
        studentInnactive.contactInfo = emptyContactInfo;

        const demoModeAsset = factory.newResource(namespace, demoModeType, 'activated');

        await demoModeRegistry.addAll([demoModeAsset]);
        await administratorRegistry.addAll([administrator1, administrator2]);
        await facultyRegistry.addAll([faculty1, faculty2]);
        await vendorRegistry.addAll([vendor1, vendor2, vendorInnactive]);
        await studentRegistry.addAll([student1, student2, studentInnactive]);

    });

    /**
     * Reconnect using a different identity.
     * @param {String} cardName The name of the card for the identity to use
     */
    async function useIdentity(cardName) {
        await businessNetworkConnection.disconnect();
        businessNetworkConnection = new BusinessNetworkConnection({ cardStore: cardStore });
        events = [];
        businessNetworkConnection.on('event', (event) => {
            events.push(event);
        });
        await businessNetworkConnection.connect(cardName);
        factory = businessNetworkConnection.getBusinessNetwork().getFactory();
    }


    it('Creating funds for an admin. The balance for "administrator1" should increase by 50', async () => {
        // Use the identity for admin.
        await useIdentity(adminCardName);
        const administrator1Before = await administratorRegistry.get('administrator1');

        // Create the transaction.
        const transaction = factory.newTransaction(namespace, 'CreateFunds');
        transaction.amount = 50;
        transaction.toUser = factory.newRelationship(namespace, administratorType, 'administrator1');

        //Submit transaction and check if balance increased
        await businessNetworkConnection.submitTransaction(transaction);
        const administrator1After = await administratorRegistry.get('administrator1');
        administrator1After.balance.should.equal(administrator1Before.balance+50);
    });

    it('Creating funds for faculty. The balance for "faculty1" should increase by 50', async () => {
        // Use the identity for admin.
        await useIdentity(adminCardName);
        const faculty1Before = await facultyRegistry.get('faculty1');

        // Create the transaction.
        const transaction = factory.newTransaction(namespace, 'CreateFunds');
        transaction.amount = 50;
        transaction.toUser = factory.newRelationship(namespace, facultyType, 'faculty1');

        //Submit transaction and check if balance increased
        await businessNetworkConnection.submitTransaction(transaction);
        const faculty1After = await facultyRegistry.get('faculty1');
        faculty1After.balance.should.equal(faculty1Before.balance+50);
    });

    it('Creating funds for a vendor. The balance for "vendor1" should increase by 50', async () => {
        // Use the identity for admin.
        await useIdentity(adminCardName);
        const vendor1Before = await vendorRegistry.get('vendor1');

        // Create the transaction.
        const transaction = factory.newTransaction(namespace, 'CreateFunds');
        transaction.amount = 50;
        transaction.toUser = factory.newRelationship(namespace, vendorType, 'vendor1');

        //Submit transaction and check if balance increased
        await businessNetworkConnection.submitTransaction(transaction);
        const vendor1After = await vendorRegistry.get('vendor1');
        vendor1After.balance.should.equal(vendor1Before.balance+50);
    });

    it('Creating funds for a student. The balance for "student1" should increase by 50', async () => {
        // Use the identity for admin.
        await useIdentity(adminCardName);
        const student1Before = await studentRegistry.get('student1');

        // Create the transaction.
        const transactionCreate = factory.newTransaction(namespace, 'CreateFunds');
        transactionCreate.amount = 50;
        transactionCreate.toUser = factory.newRelationship(namespace, studentType, 'student1');

        //Submit transaction and check if balance increased
        await businessNetworkConnection.submitTransaction(transactionCreate, 'test');
        const student1After = await studentRegistry.get('student1');
        student1After.balance.should.equal(student1Before.balance+50);

    });

    it('Deleting funds for an admin. The balance for "administrator1" should decrease by 50', async () => {
        // Use the identity for admin.
        await useIdentity(adminCardName);
        const administrator1Before = await administratorRegistry.get('administrator1');

        // Create the transaction.
        const transaction = factory.newTransaction(namespace, 'DeleteFunds');
        transaction.amount = 50;
        transaction.fromUser = factory.newRelationship(namespace, administratorType, 'administrator1');

        //Submit transaction and check if balance increased
        await businessNetworkConnection.submitTransaction(transaction);
        const administrator1After = await administratorRegistry.get('administrator1');
        administrator1After.balance.should.equal(administrator1Before.balance-50);
    });

    it('Deleting funds for faculty. The balance for "faculty1" should decrease by 50', async () => {
        // Use the identity for admin.
        await useIdentity(adminCardName);
        const faculty1Before = await facultyRegistry.get('faculty1');

        // Create the transaction.
        const transaction = factory.newTransaction(namespace, 'DeleteFunds');
        transaction.amount = 50;
        transaction.fromUser = factory.newRelationship(namespace, facultyType, 'faculty1');

        //Submit transaction and check if balance increased
        await businessNetworkConnection.submitTransaction(transaction);
        const faculty1After = await facultyRegistry.get('faculty1');
        faculty1After.balance.should.equal(faculty1Before.balance-50);
    });

    it('Deleting funds for a vendor. The balance for "vendor1" should decrease by 50', async () => {
        // Use the identity for admin.
        await useIdentity(adminCardName);
        const vendor1Before = await vendorRegistry.get('vendor1');

        // Create the transaction.
        const transaction = factory.newTransaction(namespace, 'DeleteFunds');
        transaction.amount = 50;
        transaction.fromUser = factory.newRelationship(namespace, vendorType, 'vendor1');

        //Submit transaction and check if balance increased
        await businessNetworkConnection.submitTransaction(transaction);
        const vendor1After = await vendorRegistry.get('vendor1');
        vendor1After.balance.should.equal(vendor1Before.balance-50);
    });

    it('Deleting funds for a student. The balance for "student1" should decrease by 50', async () => {
        // Use the identity for admin.
        await useIdentity(adminCardName);
        const student1Before = await studentRegistry.get('student1');

        // Create the transaction.
        const transactionCreate = factory.newTransaction(namespace, 'DeleteFunds');
        transactionCreate.amount = 50;
        transactionCreate.fromUser = factory.newRelationship(namespace, studentType, 'student1');

        //Submit transaction and check if balance increased
        await businessNetworkConnection.submitTransaction(transactionCreate);
        const student1After = await studentRegistry.get('student1');
        student1After.balance.should.equal(student1Before.balance-50);

    });

    it('Deleting more than participant balance. The balance for "student1" should go to 0', async () => {
        // Use the identity for admin.
        await useIdentity(adminCardName);
        const student1Before = await studentRegistry.get('student1');

        // Create the transaction.
        const transactionCreate = factory.newTransaction(namespace, 'DeleteFunds');
        transactionCreate.amount = student1Before.balance + 100;
        transactionCreate.fromUser = factory.newRelationship(namespace, studentType, 'student1');

        //Submit transaction and check if balance increased
        await businessNetworkConnection.submitTransaction(transactionCreate);
        const student1After = await studentRegistry.get('student1');
        student1After.balance.should.equal(0);

    });

    it('Student-to-student transactions should be rejected', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const transaction = factory.newTransaction(namespace, 'TransferFunds');
        transaction.amount = 50;
        transaction.fromUser = factory.newRelationship(namespace, studentType, 'student1');
        transaction.toUser = factory.newRelationship(namespace, studentType, 'student2');
        transaction.authToken = ' ';


        businessNetworkConnection.submitTransaction(transaction).should.be.rejectedWith('Transaction Failed. Students cannot trade with Students, Faculty, or Administrators.');
    });

    it('Student-to-Faculty transactions should be rejected', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const transaction = factory.newTransaction(namespace, 'TransferFunds');
        transaction.amount = 50;
        transaction.fromUser = factory.newRelationship(namespace, studentType, 'student1');
        transaction.toUser = factory.newRelationship(namespace, facultyType, 'faculty1');
        transaction.authToken = ' ';
        businessNetworkConnection.submitTransaction(transaction).should.be.rejectedWith('Transaction Failed. Students cannot trade with Students, Faculty, or Administrators.');
    });

    it('Student-to-Administrator transactions should be rejected', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const transaction = factory.newTransaction(namespace, 'TransferFunds');
        transaction.amount = 50;
        transaction.fromUser = factory.newRelationship(namespace, studentType, 'student1');
        transaction.toUser = factory.newRelationship(namespace, administratorType, 'administrator1');
        transaction.authToken = ' ';

        businessNetworkConnection.submitTransaction(transaction).should.be.rejectedWith('Transaction Failed. Students cannot trade with Students, Faculty, or Administrators.');
    });

    it('Faculty-to-Student transactions should be rejected', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const transaction = factory.newTransaction(namespace, 'TransferFunds');
        transaction.amount = 50;
        transaction.fromUser = factory.newRelationship(namespace, facultyType, 'faculty1');
        transaction.toUser = factory.newRelationship(namespace, studentType, 'student1');
        transaction.authToken = ' ';

        businessNetworkConnection.submitTransaction(transaction).should.be.rejectedWith('Transaction Failed. Faculty cannot trade with Students, Faculty, or Administrators.');
    });

    it('Faculty-to-Faculty transactions should be rejected', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const transaction = factory.newTransaction(namespace, 'TransferFunds');
        transaction.amount = 50;
        transaction.fromUser = factory.newRelationship(namespace, facultyType, 'faculty1');
        transaction.toUser = factory.newRelationship(namespace, facultyType, 'faculty2');
        transaction.authToken = ' ';

        businessNetworkConnection.submitTransaction(transaction).should.be.rejectedWith('Transaction Failed. Faculty cannot trade with Students, Faculty, or Administrators.');
    });

    it('Faculty-to-Administrator transactions should be rejected', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const transaction = factory.newTransaction(namespace, 'TransferFunds');
        transaction.amount = 50;
        transaction.fromUser = factory.newRelationship(namespace, facultyType, 'faculty1');
        transaction.toUser = factory.newRelationship(namespace, administratorType, 'administrator1');
        transaction.authToken = ' ';

        businessNetworkConnection.submitTransaction(transaction).should.be.rejectedWith('Transaction Failed. Faculty cannot trade with Students, Faculty, or Administrators.');
    });

    it('Admin-to-Student transactions should be rejected', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const transaction = factory.newTransaction(namespace, 'TransferFunds');
        transaction.amount = 50;
        transaction.fromUser = factory.newRelationship(namespace, administratorType, 'administrator1');
        transaction.toUser = factory.newRelationship(namespace, studentType, 'student1');
        transaction.authToken = ' ';

        businessNetworkConnection.submitTransaction(transaction).should.be.rejectedWith('Transaction Failed. Administrator cannot trade with Students, Faculty, or Administrators.');
    });

    it('Admin-to-Faculty transactions should be rejected', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const transaction = factory.newTransaction(namespace, 'TransferFunds');
        transaction.amount = 50;
        transaction.fromUser = factory.newRelationship(namespace, administratorType, 'administrator1');
        transaction.toUser = factory.newRelationship(namespace, facultyType, 'faculty2');
        transaction.authToken = ' ';

        businessNetworkConnection.submitTransaction(transaction).should.be.rejectedWith('Transaction Failed. Administrator cannot trade with Students, Faculty, or Administrators.');
    });

    it('Admin-to-Administrator transactions should be rejected', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const transaction = factory.newTransaction(namespace, 'TransferFunds');
        transaction.amount = 50;
        transaction.fromUser = factory.newRelationship(namespace, administratorType, 'administrator1');
        transaction.toUser = factory.newRelationship(namespace, administratorType, 'administrator2');
        transaction.authToken = ' ';

        businessNetworkConnection.submitTransaction(transaction).should.be.rejectedWith('Transaction Failed. Administrator cannot trade with Students, Faculty, or Administrators.');
    });

    it('Reject transactions that exceed user balance', async () => {
        await useIdentity(adminCardName);

        const student1 = await studentRegistry.get('student1');

        const transaction = factory.newTransaction(namespace, 'TransferFunds');
        transaction.amount = student1.balance + 50;
        transaction.fromUser = factory.newRelationship(namespace, studentType, 'student1');
        transaction.toUser = factory.newRelationship(namespace, vendorType, 'vendor1');
        transaction.authToken = ' ';

        await businessNetworkConnection.submitTransaction(transaction).should.be.rejectedWith('Transaction failed. Insufficient funds.');
    });

    it('Accept valid transactions', async () => {
        await useIdentity(adminCardName);

        const student1Before = await studentRegistry.get('student1');
        const administrator1Before = await administratorRegistry.get('administrator1');
        const faculty1Before = await facultyRegistry.get('faculty1');

        const vendor1Before = await vendorRegistry.get('vendor1');

        const amtToSend = Math.min(student1Before.balance, administrator1Before.balance, faculty1Before.balance)/2;
        amtToSend.should.be.greaterThan(1);

        const transaction1 = factory.newTransaction(namespace, 'TransferFunds');
        transaction1.amount = amtToSend;
        transaction1.fromUser = factory.newRelationship(namespace, studentType, 'student1');
        transaction1.toUser = factory.newRelationship(namespace, vendorType, 'vendor1');
        transaction1.authToken = ' ';

        const transaction2 = factory.newTransaction(namespace, 'TransferFunds');
        transaction2.amount = amtToSend;
        transaction2.fromUser = factory.newRelationship(namespace, facultyType, 'faculty1');
        transaction2.toUser = factory.newRelationship(namespace, vendorType, 'vendor1');
        transaction2.authToken = ' ';

        const transaction3 = factory.newTransaction(namespace, 'TransferFunds');
        transaction3.amount = amtToSend;
        transaction3.fromUser = factory.newRelationship(namespace, administratorType, 'administrator1');
        transaction3.toUser = factory.newRelationship(namespace, vendorType, 'vendor1');
        transaction3.authToken = ' ';


        await businessNetworkConnection.submitTransaction(transaction1);
        await businessNetworkConnection.submitTransaction(transaction2);
        await businessNetworkConnection.submitTransaction(transaction3);

        const student1After = await studentRegistry.get('student1');
        student1After.balance.should.equal(student1Before.balance-amtToSend);

        const administrator1After = await administratorRegistry.get('administrator1');
        administrator1After.balance.should.equal(administrator1Before.balance-amtToSend);

        const faculty1After = await facultyRegistry.get('faculty1');
        faculty1After.balance.should.equal(faculty1Before.balance-amtToSend);

        const vendor1After = await vendorRegistry.get('vendor1');
        vendor1After.balance.should.equal(vendor1Before.balance+(3*amtToSend));
    });

    it('Innactive senders should be rejected', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const transaction = factory.newTransaction(namespace, 'TransferFunds');
        transaction.amount = 50;
        transaction.fromUser = factory.newRelationship(namespace, studentType, 'studentInnactive');
        transaction.toUser = factory.newRelationship(namespace, vendorType, 'vendor1');
        transaction.authToken = ' ';

        businessNetworkConnection.submitTransaction(transaction).should.be.rejectedWith('Transaction failed. The sending account is inactive.');
    });

    it('Innactive receivers should be rejected', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const transaction = factory.newTransaction(namespace, 'TransferFunds');
        transaction.amount = 50;
        transaction.fromUser = factory.newRelationship(namespace, studentType, 'student1');
        transaction.toUser = factory.newRelationship(namespace, vendorType, 'vendorInnactive');
        transaction.authToken = ' ';

        businessNetworkConnection.submitTransaction(transaction).should.be.rejectedWith('Transaction failed. The receiving account is inactive.');
    });

    it('Users can update their Low Balance Alert Threshold', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const transaction = factory.newTransaction(namespace, 'ChangeLowBalAlert');
        transaction.thresh = 2.50;
        transaction.user = factory.newRelationship(namespace, studentType, 'student1');

        await businessNetworkConnection.submitTransaction(transaction);

        const student1After = await studentRegistry.get('student1');
        student1After.lowBalThreshold.should.equal(transaction.thresh);
    });

    it('Users can update their Transaction Limit Breach Threshold', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const transaction = factory.newTransaction(namespace, 'ChangeTxnBreach');
        transaction.thresh = 100;
        transaction.user = factory.newRelationship(namespace, studentType, 'student1');

        await businessNetworkConnection.submitTransaction(transaction);

        const student1After = await studentRegistry.get('student1');
        student1After.txnThreshold.should.equal(transaction.thresh);
    });

    it('Users can update their Contact Info', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const transaction = factory.newTransaction(namespace, 'ChangeContactInfo');
        transaction.newFirst = 'TestFirstName';
        transaction.newLast = 'TestLastName';
        transaction.newEmail = 'test219@lehigh.edu';
        transaction.newAdd = '201 University Drive';
        transaction.newCity = 'Bethlehem';
        transaction.newState = 'PA';
        transaction.newZip = '18015';
        transaction.user = factory.newRelationship(namespace, studentType, 'student1');

        await businessNetworkConnection.submitTransaction(transaction);

        const student1After = await studentRegistry.get('student1');
        student1After.contactInfo.firstName.should.equal(transaction.newFirst);
        student1After.contactInfo.lastName.should.equal(transaction.newLast);
        student1After.contactInfo.email.should.equal(transaction.newEmail);
        student1After.contactInfo.address.should.equal(transaction.newAdd);
        student1After.contactInfo.city.should.equal(transaction.newCity);
        student1After.contactInfo.state.should.equal(transaction.newState);
        student1After.contactInfo.zip.should.equal(transaction.newZip);
    });

    it('Users can update their first name independently', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const student1Before = await studentRegistry.get('student1');

        const transaction = factory.newTransaction(namespace, 'ChangeContactInfo');
        transaction.newFirst = 'firstnametest';
        transaction.newLast = '';
        transaction.newEmail = '';
        transaction.newAdd = '';
        transaction.newCity = '';
        transaction.newState = '';
        transaction.newZip = '';
        transaction.user = factory.newRelationship(namespace, studentType, 'student1');

        await businessNetworkConnection.submitTransaction(transaction);

        const student1After = await studentRegistry.get('student1');
        student1After.contactInfo.firstName.should.equal(transaction.newFirst);

        student1After.contactInfo.lastName.should.equal(student1Before.contactInfo.lastName);
        student1After.contactInfo.email.should.equal(student1Before.contactInfo.email);
        student1After.contactInfo.address.should.equal(student1Before.contactInfo.address);
        student1After.contactInfo.city.should.equal(student1Before.contactInfo.city);
        student1After.contactInfo.state.should.equal(student1Before.contactInfo.state);
        student1After.contactInfo.zip.should.equal(student1Before.contactInfo.zip);

    });

    it('Users can update their last name independently', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const student1Before = await studentRegistry.get('student1');

        const transaction = factory.newTransaction(namespace, 'ChangeContactInfo');
        transaction.newFirst = '';
        transaction.newLast = 'lastnametest';
        transaction.newEmail = '';
        transaction.newAdd = '';
        transaction.newCity = '';
        transaction.newState = '';
        transaction.newZip = '';
        transaction.user = factory.newRelationship(namespace, studentType, 'student1');

        await businessNetworkConnection.submitTransaction(transaction);

        const student1After = await studentRegistry.get('student1');
        student1After.contactInfo.firstName.should.equal(student1Before.contactInfo.firstName);
        student1After.contactInfo.lastName.should.equal(transaction.newLast);
        student1After.contactInfo.email.should.equal(student1Before.contactInfo.email);
        student1After.contactInfo.address.should.equal(student1Before.contactInfo.address);
        student1After.contactInfo.city.should.equal(student1Before.contactInfo.city);
        student1After.contactInfo.state.should.equal(student1Before.contactInfo.state);
        student1After.contactInfo.zip.should.equal(student1Before.contactInfo.zip);
    });

    it('Admin can update email independently', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const student1Before = await studentRegistry.get('student1');

        const transaction = factory.newTransaction(namespace, 'ChangeContactInfo');
        transaction.newFirst = '';
        transaction.newLast = '';
        transaction.newEmail = 'emailtest';
        transaction.newAdd = '';
        transaction.newCity = '';
        transaction.newState = '';
        transaction.newZip = '';
        transaction.user = factory.newRelationship(namespace, studentType, 'student1');

        await businessNetworkConnection.submitTransaction(transaction);

        const student1After = await studentRegistry.get('student1');
        student1After.contactInfo.firstName.should.equal(student1Before.contactInfo.firstName);
        student1After.contactInfo.lastName.should.equal(student1Before.contactInfo.lastName);
        student1After.contactInfo.email.should.equal(transaction.newEmail);
        student1After.contactInfo.address.should.equal(student1Before.contactInfo.address);
        student1After.contactInfo.city.should.equal(student1Before.contactInfo.city);
        student1After.contactInfo.state.should.equal(student1Before.contactInfo.state);
        student1After.contactInfo.zip.should.equal(student1Before.contactInfo.zip);
    });

    it('Users can update their address independently', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const student1Before = await studentRegistry.get('student1');

        const transaction = factory.newTransaction(namespace, 'ChangeContactInfo');
        transaction.newFirst = '';
        transaction.newLast = '';
        transaction.newEmail = '';
        transaction.newAdd = '100 Testing Drive';
        transaction.newCity = '';
        transaction.newState = '';
        transaction.newZip = '';
        transaction.user = factory.newRelationship(namespace, studentType, 'student1');

        await businessNetworkConnection.submitTransaction(transaction);

        const student1After = await studentRegistry.get('student1');
        student1After.contactInfo.firstName.should.equal(student1Before.contactInfo.firstName);
        student1After.contactInfo.lastName.should.equal(student1Before.contactInfo.lastName);
        student1After.contactInfo.email.should.equal(student1Before.contactInfo.email);
        student1After.contactInfo.address.should.equal(transaction.newAdd);
        student1After.contactInfo.city.should.equal(student1Before.contactInfo.city);
        student1After.contactInfo.state.should.equal(student1Before.contactInfo.state);
        student1After.contactInfo.zip.should.equal(student1Before.contactInfo.zip);
    });

    it('Users can update their city independently', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const student1Before = await studentRegistry.get('student1');

        const transaction = factory.newTransaction(namespace, 'ChangeContactInfo');
        transaction.newFirst = '';
        transaction.newLast = '';
        transaction.newEmail = '';
        transaction.newAdd = '';
        transaction.newCity = 'citytest';
        transaction.newState = '';
        transaction.newZip = '';
        transaction.user = factory.newRelationship(namespace, studentType, 'student1');

        await businessNetworkConnection.submitTransaction(transaction);

        const student1After = await studentRegistry.get('student1');
        student1After.contactInfo.firstName.should.equal(student1Before.contactInfo.firstName);
        student1After.contactInfo.lastName.should.equal(student1Before.contactInfo.lastName);
        student1After.contactInfo.email.should.equal(student1Before.contactInfo.email);
        student1After.contactInfo.address.should.equal(student1Before.contactInfo.address);
        student1After.contactInfo.city.should.equal(transaction.newCity);
        student1After.contactInfo.state.should.equal(student1Before.contactInfo.state);
        student1After.contactInfo.zip.should.equal(student1Before.contactInfo.zip);
    });

    it('Users can update their state independently', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const student1Before = await studentRegistry.get('student1');

        const transaction = factory.newTransaction(namespace, 'ChangeContactInfo');
        transaction.newFirst = '';
        transaction.newLast = '';
        transaction.newEmail = '';
        transaction.newAdd = '';
        transaction.newCity = '';
        transaction.newState = 'statetest';
        transaction.newZip = '';
        transaction.user = factory.newRelationship(namespace, studentType, 'student1');

        await businessNetworkConnection.submitTransaction(transaction);

        const student1After = await studentRegistry.get('student1');
        student1After.contactInfo.firstName.should.equal(student1Before.contactInfo.firstName);
        student1After.contactInfo.lastName.should.equal(student1Before.contactInfo.lastName);
        student1After.contactInfo.email.should.equal(student1Before.contactInfo.email);
        student1After.contactInfo.address.should.equal(student1Before.contactInfo.address);
        student1After.contactInfo.city.should.equal(student1Before.contactInfo.city);
        student1After.contactInfo.state.should.equal(transaction.newState);
        student1After.contactInfo.zip.should.equal(student1Before.contactInfo.zip);
    });

    it('Users can update their zip independently', async () => {
        //Admin identity initiates the txn
        await useIdentity(adminCardName);

        const student1Before = await studentRegistry.get('student1');

        const transaction = factory.newTransaction(namespace, 'ChangeContactInfo');
        transaction.newFirst = '';
        transaction.newLast = '';
        transaction.newEmail = '';
        transaction.newAdd = '';
        transaction.newCity = '';
        transaction.newState = '';
        transaction.newZip = 'ziptest';
        transaction.user = factory.newRelationship(namespace, studentType, 'student1');

        await businessNetworkConnection.submitTransaction(transaction);

        const student1After = await studentRegistry.get('student1');
        student1After.contactInfo.firstName.should.equal(student1Before.contactInfo.firstName);
        student1After.contactInfo.lastName.should.equal(student1Before.contactInfo.lastName);
        student1After.contactInfo.email.should.equal(student1Before.contactInfo.email);
        student1After.contactInfo.address.should.equal(student1Before.contactInfo.address);
        student1After.contactInfo.city.should.equal(student1Before.contactInfo.city);
        student1After.contactInfo.state.should.equal(student1Before.contactInfo.state);
        student1After.contactInfo.zip.should.equal(transaction.newZip);
    });

    it('Conduct high txn volume and ensure the total funds in network stays consistent');

    it('Verify permissions. Only admin should be allowed to read/write to blockchain');

    it('Return participant\'s remaining balance. Should be stored in an event');

    it('Breaking Minimum Balance Threshold creates \'Low Balance Alert\' event.');

    it('Breaking Maximum Transaction Threshold creates \'Transaction Threshold Breach\' event.');

    it('Submit a transaction using a demo AuthToken to verify the connection');

});
