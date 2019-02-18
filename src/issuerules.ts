// You can import your modules
// import index from '../src/index'


import path from 'path'
import fs from 'fs'
import jsyaml, { YAMLException } from 'js-yaml'

export interface IIssueRules {
  rules: IIssueRule[];
  noMatches: IIssueRule[];
  tags: ITagsRule[];
}

export interface IIssueRule {
  // filters
  valueFor?: string;
  option: string[];

  // match
  contains: string;
  equals: string;

  // actions
  addTags: string[];
  assign: string[];
}

export interface ITagsRule {
  noneIn: string[];
  noneMatch: string;
}

export interface ITagResults {
  tagsToAdd: string[]
  assigneesToAdd: string[]
}

export async function loadYamlContents(yamlPath: string) {
  return new Promise<any>((resolve, reject) => {
    fs.readFile(yamlPath, function(err, data) {
      if (err) {
        reject(err)
      }
      else {
        resolve(data.toString());
      }
    })
  }); 
}

export function splitLines(contents: string): string[] {
  return contents.split(/\r\n|\n|\r/);
}

export function parseYamlContents(contents: string): IIssueRules {
  let yaml = jsyaml.safeLoad(contents);
  
  let issueRules: IIssueRules = <IIssueRules>{};
  issueRules.rules = yaml['rules']; 
  issueRules.noMatches = yaml['nomatches'];
  issueRules.tags = yaml['tags'];  

  return issueRules;
}

export class RuleEngine {
  
  private _valueForMap: {[key:string]:boolean} = {};

  constructor() {
   
  }

  public processRules(issueContents: string, rules: IIssueRule[]): ITagResults {
    let results: ITagResults = <ITagResults>{};
    results.tagsToAdd = [];
    results.assigneesToAdd = [];

    this._valueForMap = {};
    for (let i=0; i < rules.length; i++) {
      let key: string | undefined = rules[i].valueFor;
      if (key) {
        this._valueForMap[key.toUpperCase()] = true;
      }
    }  

    let lines: string[] = splitLines(issueContents);
    for (let i=0; i < lines.length; i++) {
      let lr = this.processRulesForLine(lines[i], rules);
      this.pushValues(results.tagsToAdd, lr.tagsToAdd);
      this.pushValues(results.assigneesToAdd, lr.assigneesToAdd);
    }

    return results;
  }

  public addIfNoneIn(add:string[], ifNone: string[], inTags: string[]) {
    let found: boolean = false;

    for (let i = 0; i < ifNone.length; i++) {
      if (inTags.indexOf(ifNone[i]) >= 0) {
        found = true;
        break;
      }
    }

    if (!found) {
      this.pushValues(inTags, add);
    }
  }

  private processRulesForLine(line: string, rules: IIssueRule[]): ITagResults {
    let results: ITagResults = <ITagResults>{};
    results.tagsToAdd = [];
    results.assigneesToAdd = [];
    
    line = line.trim();
  
    // valuesFor
    let ci = line.indexOf(':');
    if (ci > 0 && line.length + 1 > ci) {
      let key = line.substr(0, ci);

      // only process this line against all rules if key is in any rule (n^2)
      if (this._valueForMap[key.toUpperCase()] == true) {
        let value = line.substr(ci+1).trim().toUpperCase();

        for (let i = 0; i < rules.length; i++) {
          let match: boolean = false;
          let rule: IIssueRule = rules[i];
          if (rule.equals && rule.equals.toUpperCase() === value) {
            match = true;
          }
          
          if (rule.contains && value.indexOf(rule.contains.toUpperCase()) >= 0) {
            match = true;
          }

          if (match) {
            this.pushValues(results.tagsToAdd, rule.addTags);
            this.pushValues(results.assigneesToAdd, rule.assign);
          }
        }
      }
    }

    return results;
  }  
  
  private pushValues(arr: string[], values: string[]) {
    if (values) {
      for (let i=0; i<values.length; i++) {
        if (values[i] && arr.indexOf(values[i]) < 0) {
          arr.push(values[i]);
        }
      }
    }
  }
}










