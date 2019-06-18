/* eslint-disable no-undef */
import { $, $$, browser, ExpectedConditions as until } from 'protractor';
import { appHost, testName } from '../../protractor.conf';
import { nonAdminSecret, nonAdminProvider } from './utils/mocks';
import { createResources } from './utils/utils';
import { KUBEADMIN_IDP, KUBEADMIN_USERNAME, BRIDGE_KUBEADMIN_PASSWORD, BRIDGE_HTPASSWD_IDP, BRIDGE_HTPASSWD_USERNAME, BRIDGE_HTPASSWD_PASSWORD } from './utils/consts';
import * as loginView from '../../views/login.view';
import * as crudView from '../../views/crud.view';
import Wizard from './models/wizard';
import Yaml from './models/yaml';
import { logout } from '../../views/kubevirt/login.view';
import { execSync } from 'child_process';

describe('Test nonadmin user behaviour', () => {
  const nonAdminNS = `${testName}-nonadmin`;
  const userRole = ['view', 'edit'];

  const verifyPermissions = async function(ns: string, perm: string) {
    const wizard = new Wizard();
    const yaml = new Yaml();

    await browser.get(`${appHost}/k8s/ns/${ns}/virtualmachines`);
    if (perm === 'noAccess') {
      await browser.wait(until.presenceOf(crudView.errorMessage));
      expect(crudView.errorMessage.getText()).toContain('cannot list resource');

      // TODO: check it can't use vm dialog once BZ1728523 is fixed.
    }
    if (perm === 'view') {
      await crudView.isLoaded(); // no error indicates it can view resource.
      // TODO: check it can't use vm dialog once BZ1728523 is fixed.
    }
    if (perm === 'edit') {
      await crudView.isLoaded();
      await wizard.openWizard();
      await wizard.close();

      await yaml.openYamlPage();
      await yaml.cancelCreateVM();
    }

    await browser.get(`${appHost}/k8s/ns/${ns}/vmtemplates`);
    if (perm === 'noAccess') {
      await browser.wait(until.presenceOf(crudView.errorMessage));
      expect(crudView.errorMessage.getText()).toContain('cannot list resource');
    }
    if (perm === 'view') {
      await crudView.isLoaded(); // no error indicates it can view resource.
      // TODO: check it can't use vm dialog once BZ1728523 is fixed.
    }
    if (perm === 'edit') {
      await crudView.isLoaded();
      await wizard.openWizard();
      await wizard.close();
    }

    await browser.get(`${appHost}/overview/ns/${ns}/`);
    if (perm === 'noAccess') {
      await browser.wait(until.presenceOf(crudView.errorMessage));
      expect(crudView.errorMessage.getText()).toContain('cannot list resource');
    }
    if (perm === 'view') {
      await crudView.isLoaded(); // no error indicates it can view resource.
      // TODO: check it can't use vm dialog once BZ1728523 is fixed.
    }
    if (perm === 'edit') {
      await crudView.isLoaded();
    }
  };

  const verifyPermissionWithRoleBinding = async function(ns: string, roleBinding: string, perm: string) {
    execSync(`oc adm policy add-${roleBinding}-to-user ${perm} ${BRIDGE_HTPASSWD_USERNAME} -n ${ns}`);
    await verifyPermissions(perm, ns);
    execSync(`oc adm policy remove-${roleBinding}-from-user ${perm} ${BRIDGE_HTPASSWD_USERNAME} -n ${ns}`);
  };

  beforeAll(async() => {
    try {
      execSync('oc get -o yaml -n openshift-config secret test');
    } catch (error) {
      createResources([nonAdminSecret, nonAdminProvider]);
    }
  });

  afterAll(async() => {
    await logout();
    await browser.wait(until.presenceOf($('.login-pf')));
    await loginView.login(KUBEADMIN_IDP, KUBEADMIN_USERNAME, BRIDGE_KUBEADMIN_PASSWORD);
  });

  it('Login with nonadmin', async() => {
    await logout();
    // wait for logout complete
    await browser.sleep(10000);
    // TODO: remove the refill appHost after bug 1721423 is fixed.
    await browser.get(appHost);
    await browser.wait(until.presenceOf($('.login-pf')));
    await loginView.login(BRIDGE_HTPASSWD_IDP, BRIDGE_HTPASSWD_USERNAME, BRIDGE_HTPASSWD_PASSWORD);
    //expect(loginView.userDropdown.getText()).toContain(BRIDGE_HTPASSWD_IDP);
  });

  it(`Creates test namespace ${nonAdminNS} for nonAdmin tests`, async() => {
    const resource = browser.params.openshift === 'true' ? 'projects' : 'namespaces';
    await browser.get(`${appHost}/k8s/cluster/${resource}`);
    await crudView.isLoaded();
    const exists = await crudView.rowForName(nonAdminNS).isPresent();
    if (!exists) {
      await crudView.createYAMLButton.click();
      await browser.sleep(3000);
      await browser.wait(until.presenceOf($('.modal-body__field')));
      await $$('.modal-body__field').get(0).$('input').sendKeys(nonAdminNS);
      await $$('.modal-body__field').get(1).$('input').sendKeys(`test-name=${nonAdminNS}`);
      await $('.modal-content').$('#confirm-action').click();
    }
  });

  it('Nonadmin can use vm dialog in its own namespace but not other namespace', async() => {
    await verifyPermissions(nonAdminNS, 'edit');
    await verifyPermissions(testName, 'noAccess');
  });

  userRole.forEach(role => {
    it(`Nonadmin with RoleBinding ${role} can ${role} vm objetcs in the binding NS but not other NS`, async() => {
      execSync(`oc adm policy add-role-to-user ${role} ${BRIDGE_HTPASSWD_USERNAME} -n ${testName}`);
      await verifyPermissions(testName, role);
      await verifyPermissions('default', 'noAccess');
      execSync(`oc adm policy remove-role-from-user ${role} ${BRIDGE_HTPASSWD_USERNAME} -n ${testName}`);
    });
  });

  userRole.forEach((role) => {
    it(`Nonadmin with ClusterRoleBinding ${role} can ${role} vm objetcs in the cluster`, async() => {
      await verifyPermissionWithRoleBinding(testName, 'cluster-role', role);
      await verifyPermissionWithRoleBinding('default', 'cluster-role', role);
    });
  });
});
