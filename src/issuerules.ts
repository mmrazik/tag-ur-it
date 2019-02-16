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

export function deserialize(contents: string): IIssueRules {
  let yaml = jsyaml.safeLoad(contents);

  let ir: IIssueRules = <IIssueRules>{};
  ir.rules = yaml['rules']; 
  ir.noMatches = yaml['nomatches'];
  ir.tags = yaml['tags'];

  return ir;
}
