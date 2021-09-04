# Mela Recipe Parser

This is a simple Deno package to parse exported recipe files (of type `.melarecipe` and `.melarecipes`) from the iOS recipe app [Mela](https://mela.recipes).

```typescript
import Recipes, { Recipe } from "https://deno.land/x/mela_recipe_parser/mod.ts"

const recipes: Recipe[] = await Recipes.readFromFile("./Recipes.melarecipes")
await Recipes.writeToDir("../Desktop", recipes)
```