"use strict";
const nspell = require("nspell");
const { promisify } = require("util");
const regeneratorRuntime = require("regenerator-runtime");
const { matchPatterns } = require("@textlint/regexp-string-matcher");
const StringSource = require("textlint-util-to-string");

const reporter = (
  { Syntax, RuleError, report, getSource, fixer },
  { language = "en-us", skipPatterns = [] }
) => {
  return {
    async [Syntax.Paragraph](node) {
      const text = getSource(node);
      const source = new StringSource(node);
      const dictionary = require(`dictionary-${language}`);
      const spell = nspell(await promisify(dictionary)());
      const regExp = /\w+/g;
      for (
        let matches = regExp.exec(text);
        matches !== null;
        matches = regExp.exec(text)
      ) {
        const originalIndex = source.originalIndexFromIndex(matches.index);
        const originalRange = [
          originalIndex,
          originalIndex + matches[0].length
        ];
        const excludes = matchPatterns(text, skipPatterns);
        const doesContain = exclude =>
          exclude.startIndex >= originalRange[0] &&
          originalRange[1] <= exclude.endIndex;
        if (!excludes.some(doesContain) && !spell.correct(matches[0])) {
          const suggestions = spell.suggest(matches[0]);
          const fix =
            suggestions.length === 1
              ? fixer.replaceTextRange(originalRange, suggestions[0])
              : undefined;
          const message = `${matches[0]} -> ${suggestions.join(", ")}`;
          const ruleError = new RuleError(message, {
            index: originalIndex,
            fix
          });
          report(node, ruleError);
        }
      }
    }
  };
};

module.exports = {
  linter: reporter,
  fixer: reporter
};
