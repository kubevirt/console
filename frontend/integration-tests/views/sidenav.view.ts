/* eslint-disable no-undef, no-unused-vars */

import { $$, by, browser, element, ExpectedConditions as until } from 'protractor';

export const navSectionFor = (name: string) => element(by.cssContainingText('.navigation-container__section:not(.navigation-container__section--cluster-picker)', name));

export const clickNavLink = (path: [string, string]) => browser.wait(until.visibilityOf(navSectionFor(path[0])))
  .then(() => navSectionFor(path[0]).click())
  .then(() => browser.wait(until.visibilityOf(navSectionFor(path[0]).element(by.linkText(path[1])))))
  .then(() => navSectionFor(path[0]).element(by.linkText(path[1])).click());

export const activeLink = $$('.co-m-nav-link.active');
