// You can import your modules
// import index from '../src/index'

import nock from 'nock'
// Requiring our app implementation
import myProbotApp from '../src'
import { Probot } from 'probot'
import path from 'path'
import fs from 'fs'
import jsyaml from 'js-yaml'
import * as irm from '../src/issuerules'

// Requiring our fixtures
import payload from './fixtures/issues.opened.json'
import { S_IFMT } from 'constants';

const issueCreatedBody = { body: 'Thanks for opening this issue!' }

nock.disableNetConnect()

function testYamlPath(name: string): string {
  return path.join(__dirname, 'res', name + '.yml');
}

describe('My Probot app', () => {
  let probot: any

  beforeEach(() => {
    probot = new Probot({ id: 123, cert: 'test' })
    // Load our app into probot
    const app = probot.load(myProbotApp)

    // just return a test token
    app.app = () => 'test'
  })

  test('can parse basic yaml file', async(done) => {
    let yc = await irm.loadYamlContents(testYamlPath('basic'));
    let issueRules: irm.IIssueRules = irm.parseYamlContents(yc);

    expect(issueRules.rules.length).toBeGreaterThan(0);
    expect(issueRules.noMatches.length).toBeGreaterThan(0);
    expect(issueRules.tags.length).toBeGreaterThan(0);
    done();
  })

  test('splitLines correctly splits on new lines', async(done) => {
    // mix CR and casing along with whitespace
    let contents: string = 'some line\r\n  Item: Bar \r other line \r\n Item: baz';
    let lines: string[] = irm.splitLines(contents);
    expect(lines.length).toBe(4);
    done();
  })

  test('valueFor equals rules work', async(done) => {
    let yc = await irm.loadYamlContents(testYamlPath('valueFor'));
    let issueRules: irm.IIssueRules = irm.parseYamlContents(yc);
    let eng: irm.RuleEngine = new irm.RuleEngine();

    // mix CR and casing along with whitespace
    // notice case insensitive value on key and value
    let contents: string = 'some line\r\n  item: Bar \r other line \r\n Item: baz';

    let res: irm.ITagResults = eng.processRules(contents, issueRules.rules);
    expect(res.tagsToAdd.indexOf('Area: Bar')).toBeGreaterThanOrEqual(0);
    expect(res.assigneesToAdd.indexOf('John')).toBeGreaterThanOrEqual(0);
    done();
  })

  test('valueFor contains rules work', async(done) => {
    let yc = await irm.loadYamlContents(testYamlPath('valueFor'));
    let issueRules: irm.IIssueRules = irm.parseYamlContents(yc);
    let eng: irm.RuleEngine = new irm.RuleEngine();

    // aFooBar should match the rule of contains Foo
    // mix CR and casing along with whitespace
    // notice case insensitive value on key and value
    let contents: string = 'some line\r\n  item: aFooBar \r other line \r\n Item: baz';

    let res: irm.ITagResults = eng.processRules(contents, issueRules.rules);
    expect(res.tagsToAdd.indexOf('Area: Foo')).toBeGreaterThanOrEqual(0);
    expect(res.assigneesToAdd.indexOf('John')).toBeGreaterThanOrEqual(0);
    done();
  }) 
  
  test('adds tags if noneIn set', async(done) => {
    let eng: irm.RuleEngine = new irm.RuleEngine();
    let tagSet: string[] = ['el1', 'el2'];
    eng.addIfNoneIn(['add1', 'add2'], // add
                    ['xyz'],          // ifNone
                    tagSet);          // in

    expect(tagSet.length).toBe(4);
    done();
  })

  test('does not adds tags if in set', async(done) => {
    let eng: irm.RuleEngine = new irm.RuleEngine();
    let tagSet: string[] = ['el1', 'el2'];
    eng.addIfNoneIn(['add1', 'add2'], // add
                    ['el1'],          // ifNone
                    tagSet);          // in

    expect(tagSet.length).toBe(2);
    done();
  })  
  
  test('adds tags if none match expression', async(done) => {
    let eng: irm.RuleEngine = new irm.RuleEngine();
    let tagSet: string[] = ['el1', 'el2'];
    eng.addIfNoneMatch(['add1', 'add2'], '\s*Area:\s*([^]*)', tagSet);

    expect(tagSet.length).toBe(4);
    done();
  })

  test('does not add tags if set matches expression', async(done) => {
    let eng: irm.RuleEngine = new irm.RuleEngine();
    let tagSet: string[] = ['Area: Foo', 'el2'];
    eng.addIfNoneMatch(['add1', 'add2'], '\s*Area:\s*([^]*)', tagSet);

    expect(tagSet.length).toBe(2);
    done();
  })    

  test('e2e adds triage tag appropriately', async(done) => {
    let yc = await irm.loadYamlContents(testYamlPath('basic'));
    let issueRules: irm.IIssueRules = irm.parseYamlContents(yc);
    let eng: irm.RuleEngine = new irm.RuleEngine();

    // aFooBar should match the rule of contains Foo
    // mix CR and casing along with whitespace
    // notice case insensitive value on key and value
    let contents: string = 'some line\r\n  item: aFooBar \r other line \r\n Item: baz';

    let res: irm.ITagResults = eng.processRules(contents, issueRules.rules);
    console.log(res);
    expect(res.tagsToAdd.indexOf('Area: Foo')).toBeGreaterThanOrEqual(0);
    expect(res.assigneesToAdd.indexOf('Bob')).toBeGreaterThanOrEqual(0);

    eng.processTags(res.tagsToAdd, issueRules.tags);
    expect(res.tagsToAdd.indexOf('triage')).toBeGreaterThanOrEqual(0);
    done();
  })

  // test('creates a comment when an issue is opened', async (done) => {
  //   // Test that we correctly return a test token
  //   nock('https://api.github.com')
  //     .post('/app/installations/2/access_tokens')
  //     .reply(200, { token: 'test' })

  //   // Test that a comment is posted
  //   nock('https://api.github.com')
  //     .post('/repos/hiimbex/testing-things/issues/1/comments', (body: any) => {
  //       done(expect(body).toMatchObject(issueCreatedBody))
  //       return true
  //     })
  //     .reply(200)

  //   // Receive a webhook event
  //   await probot.receive({ name: 'issues', payload })
  // })
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest

// For more information about testing with Nock see:
// https://github.com/nock/nock
