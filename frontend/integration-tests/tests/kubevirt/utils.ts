/* eslint-disable no-unused-vars, no-undef */
import { execSync } from 'child_process';
import { $, by, ElementFinder } from 'protractor';

export const PAGE_LOAD_TIMEOUT = 5000;
export const VM_WIZARD_LOAD_TIMEOUT = 10000;
export const VM_BOOTUP_TIMEOUT = 60000;
export const VM_STOP_TIMEOUT = 6000;
export const VM_ACTIONS_TIMEOUT = 90000;

export type provision = {
  method: string,
  source?: string,
};

export type networkResource = {
  name: string,
  mac: string,
  networkDefinition: string,
}[];

export type storageResource = {
  name: string,
  size: string,
  StorageClass: string,
}[];

export function removeLeakedResources(leakedResources: Set<string>) {
  const leakedArray: Array<string> = [...leakedResources];
  if (leakedArray.length > 0) {
    console.error(`Leaked ${leakedArray.join()}`);
    leakedArray.map(r => JSON.parse(r) as {name: string, namespace: string, kind: string})
      .forEach(({name, namespace, kind}) => {
        try {
          execSync(`kubectl delete -n ${namespace} --cascade ${kind} ${name}`);
        } catch (error) {
          console.error(`Failed to delete ${kind} ${name}:\n${error}`);
        }
      });
  }
}

export async function selectDropdownOption(dropdownId: string, option: string) {
  await $(dropdownId).click();
  await $(`${dropdownId} + ul`).element(by.linkText(option)).click();
}

export async function fillInput(element: ElementFinder, value: string) {
  await element.clear().then(() => element.sendKeys(value));
}

export async function tickCheckbox(element: ElementFinder) {
  await element.click();
}
