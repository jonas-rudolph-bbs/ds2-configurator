import { Injectable } from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";
import { ConfigurationFormFactory } from "./configuration-form.factory";
import { TopicDefinition, TopicsMap } from "../services/configuration.types";

export interface ConfigurationFormState {
  topics: [string, TopicDefinition][];
  topicForms: Map<string, Map<string, FormGroup>>;
  topicNameControls: Map<string, FormControl<string>>;
  originalTopicNames: Map<string, string>;
  selectedTopic: string;
}

@Injectable({ providedIn: "root" })
export class ConfigurationFormMapper {
  constructor(private formFactory: ConfigurationFormFactory) {}

  buildFormStateFromTopics(topicsMap: TopicsMap): ConfigurationFormState {
    const topics = Object.entries(topicsMap);
    const topicForms = this.buildTopicForms(topicsMap);
    const { topicNameControls, originalTopicNames } =
      this.buildTopicNameControls(topics);

    return {
      topics,
      topicForms,
      topicNameControls,
      originalTopicNames,
      selectedTopic: topics[0]?.[0] ?? "",
    };
  }

  validateAll(
    topicNameControls: Map<string, FormControl<string>>,
    topicForms: Map<string, Map<string, FormGroup>>
  ): boolean {
    let allValid = true;

    for (const ctrl of topicNameControls.values()) {
      ctrl.markAsTouched();

      if (ctrl.invalid) {
        allValid = false;
      }
    }

    for (const formsByEntryKey of topicForms.values()) {
      for (const attrForm of formsByEntryKey.values()) {
        attrForm.markAllAsTouched();

        if (attrForm.invalid) {
          allValid = false;
        }
      }
    }

    return allValid;
  }

  buildSavePayload(
    topics: [string, TopicDefinition][],
    topicNameControls: Map<string, FormControl<string>>,
    topicForms: Map<string, Map<string, FormGroup>>
  ): TopicsMap {
    const topicNameMap = this.buildTopicNameMap(topics, topicNameControls);

    const payload: TopicsMap = {};

    for (const [topicName, formsByEntryKey] of topicForms.entries()) {
      const finalTopicName = topicNameMap.get(topicName) ?? topicName;
      const topicPayload: TopicDefinition = {};

      for (const [entryKey, attrForm] of formsByEntryKey.entries()) {
        const newAttributeKey = attrForm.get("attName")?.value?.trim();
        const finalAttributeKey = newAttributeKey || entryKey;

        const rulesArray = attrForm.get("rules") as any;

        topicPayload[finalAttributeKey] = rulesArray.controls.map(
          (fg: FormGroup) => {
            const rule = fg.get("rule")?.value;
            const paramsGroup = fg.get("params") as FormGroup | null;
            const params = paramsGroup ? paramsGroup.value : {};
            const handler = fg.get("handler")?.value || "";

            return { rule, params, handler };
          }
        );
      }

      payload[finalTopicName] = topicPayload;
    }

    return payload;
  }

  private buildTopicNameControls(
    topics: [string, TopicDefinition][]
  ): {
    topicNameControls: Map<string, FormControl<string>>;
    originalTopicNames: Map<string, string>;
  } {
    const topicNameControls = new Map<string, FormControl<string>>();
    const originalTopicNames = new Map<string, string>();

    const getAllNames = () =>
      Array.from(topicNameControls.values()).map((c) => c.value);

    for (const [topicName] of topics) {
      const ctrl = this.formFactory.createTopicNameControl(
        topicName,
        getAllNames
      );

      topicNameControls.set(topicName, ctrl);
      originalTopicNames.set(topicName, topicName);
    }

    for (const ctrl of topicNameControls.values()) {
      ctrl.updateValueAndValidity({ emitEvent: false });
    }

    return {
      topicNameControls,
      originalTopicNames,
    };
  }

  private buildTopicForms(
    topics: TopicsMap
  ): Map<string, Map<string, FormGroup>> {
    const topicForms = new Map<string, Map<string, FormGroup>>();

    for (const [topicName, topicDef] of Object.entries(topics)) {
      const formsByEntryKey = new Map<string, FormGroup>();

      const getAllAttributeNames = () =>
        Array.from(formsByEntryKey.values()).map((fg) =>
          (fg.get("attName")?.value ?? "").toString()
        );

      for (const [entryKey, rules] of Object.entries(topicDef)) {
        formsByEntryKey.set(
          entryKey,
          this.formFactory.buildAttributeForm(
            entryKey,
            getAllAttributeNames,
            rules ?? []
          )
        );
      }

      for (const fg of formsByEntryKey.values()) {
        fg.get("attName")?.updateValueAndValidity({ emitEvent: false });
      }

      topicForms.set(topicName, formsByEntryKey);
    }

    return topicForms;
  }

  private buildTopicNameMap(
    topics: [string, TopicDefinition][],
    topicNameControls: Map<string, FormControl<string>>
  ): Map<string, string> {
    const topicNameMap = new Map<string, string>();

    for (const [topicName] of topics) {
      const ctrl = topicNameControls.get(topicName);
      const newName = ctrl?.value?.trim();
      const finalName = newName || topicName;

      topicNameMap.set(topicName, finalName);
    }

    return topicNameMap;
  }
}