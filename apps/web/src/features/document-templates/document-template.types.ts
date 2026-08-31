export type TemplateId = 'adr' | 'tech-spec' | 'runbook';

export interface DocumentTemplate {
  id: TemplateId;
  name: string;
  description: string;
  titlePrefix: string;
  defaultTags: string[];
  sections: string[];
  scaffoldContent: string;
}
