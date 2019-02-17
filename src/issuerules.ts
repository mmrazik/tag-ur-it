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
  assign: string;
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

export class RuleEngine {
  
  private _valueForMap: {[key:string]:boolean} = {};

  constructor(contents: string) {
    let yaml = jsyaml.safeLoad(contents);
    this.issueRules = <IIssueRules>{};
    this.issueRules.rules = yaml['rules']; 
    this.issueRules.noMatches = yaml['nomatches'];
    this.issueRules.tags = yaml['tags'];

    this.issueRules.rules.forEach((rule: IIssueRule) => {
      if (rule.valueFor) {
        this._valueForMap[rule.valueFor.toUpperCase()] = true;
      }
    })
  }

  public issueRules: IIssueRules;

  private processRulesForLine(line: string): ITagResults {
    let results: ITagResults = <ITagResults>{};
    results.tagsToAdd = [];
    results.assigneesToAdd = [];
    let match: boolean = false;
    
    line = line.trim();
  
    // valuesFor
    let ci = line.indexOf(':');
    if (ci > 0 && line.length + 1 > ci) {
      let key = line.substr(0, ci);

      // only process this line against all rules if key is in any rule (n^2)
      if (this._valueForMap[key.toUpperCase()] == true) {
        let value = line.substr(ci+1).trim().toUpperCase();

        for (let i = 0; i < this.issueRules.rules.length; i++) {
          let rule: IIssueRule = this.issueRules.rules[i];
          if (rule.equals && rule.equals.toUpperCase() === value) {
            match = true;
          }
          
          if (rule.contains && value.indexOf(rule.contains.toUpperCase()) >= 0) {
            match = true;
          }

          if (match) {
            results.tagsToAdd = results.tagsToAdd.concat(rule.addTags);
            results.assigneesToAdd = results.assigneesToAdd.concat(rule.assign);
          }
        }
      }
    }

    return results;
  }  

  public processRules(issueContents: string): ITagResults {
    let results: ITagResults = <ITagResults>{};
    results.tagsToAdd = [];
    results.assigneesToAdd = [];

    let lines: string[] = splitLines(issueContents);
    for (let i=0; i < lines.length; i++) {
      let lr = this.processRulesForLine(lines[i]);
      results.tagsToAdd = results.tagsToAdd.concat(lr.tagsToAdd);
      results.assigneesToAdd = results.assigneesToAdd.concat(lr.assigneesToAdd);
    }

    return results;
  }  
}










