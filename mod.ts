import { decompress } from "https://deno.land/x/zip@v1.2.1/mod.ts"
import { extname } from "https://deno.land/std@0.106.0/path/mod.ts"
const { readDir, readFile, chdir, makeTempDir, remove, writeTextFile } = Deno

export interface Recipe {
    /**
     * The unique ID of the recipe.
     *
     * If `link` is a URL, then ID is `link` without the protocol at the beginning.
     *
     * If `link` is not a URL, then ID is a UUID.
     */
    id: string
    date: Date
    images: string[]
    title?: string
    yield?: string
    cookTime?: string
    prepTime?: string
    totalTime?: string
    /** Also "source"; could be a URL or plain text */
    link?: string
    text?: string
    ingredients?: string
    instructions?: string
    notes?: string
    nutrition?: string
    /** An array of tags */
    categories: string[]
    wantToCook: boolean
    favorite: boolean
}

namespace Recipes {
    /**
     * Converts a Swift time interval (as encoded to JSON with `Swift.JSONEncoder`)
     * to a JavaScript Date.
     *
     * Since Mela is written in Swift, this is needed to convert their encoded dates to JS Dates.
     *
     * @see https://stackoverflow.com/a/52001521
     *
     * @param { number } timeInterval - A Swift time interval; seconds since 2001-01-01.
     *
     * @returns { Date } A Date representing the Swift time interval.
     *
     */
    function timeIntervalToDate(timeInterval: number): Date {
        var swiftOffset = Date.UTC(2001, 0, 1) // 978307200000
        return new Date(swiftOffset + timeInterval * 1000)
    }

    async function readFromJSON(recipe: string): Promise<Recipe> {
        type ParsedRecipe = Omit<Recipe, "date"> & { date: number }

        const data = await readFile(recipe)
        const text = new TextDecoder("utf-8").decode(data)
        // '.melarecipe' files are really just JSON files with the `ParsedRecipe` schema
        const parsedRecipe: ParsedRecipe = JSON.parse(text)
        const date = timeIntervalToDate(parsedRecipe.date)
        // @ts-ignore
        delete parsedRecipe.date

        return { ...parsedRecipe, date }
    }

    async function readFromZip(recipe: string): Promise<Recipe[]> {
        const tmpDir = await makeTempDir({ prefix: "mela_recipe_parser" })
        chdir(tmpDir)
        // '.melarecipes' files are really just ZIP archives containing '.melarecipe' files
        const unzippedRecipes = await decompress(recipe)

        if (!unzippedRecipes) {
            throw new Error(`Unable to decompress Mela file: ${recipe}`)
        }

        const recipes: Recipe[] = []

        for await (const file of readDir(unzippedRecipes)) {
            if (!file.isFile) continue
            const recipe = await readFromJSON(file.name)
            recipes.push(recipe)
        }

        await remove(tmpDir, { recursive: true })
        return recipes
    }

    /**
     * Reads a `Recipe` object from a .melarecipe or .melarecipes file.
     *
     * @async
     *
     * @param { string } filePath - Path to the local '.melarecipe' or '.melarecipes' file.
     *
     * @returns { Promise<Recipe | Recipe[]> }
     * Returns a `Recipe` if a '.melarecipe' file path is passed in
     * or a `Recipe[]` if a '.melarecipes' file path is passed in.
     *
     * @throws { Error }
     * Throws an error if the file path does not point to a '.melarecipes' or '.melarecipe' file.
     * Throws an error if the '.melarecipes' file is corrupted and cannot be decompressed.
     *
     */
    export async function readFromFile(filePath: string): Promise<Recipe | Recipe[]> {
        // prettier-ignore
        switch (extname(filePath)) {
            case ".melarecipes": return await readFromZip(filePath)
            case ".melarecipe": return await readFromJSON(filePath)
            default: throw new Error("File must be format '.melarecipes' or '.melarecipe'")
        }
    }

    /**
     * Writes a `Recipe` object to a new JSON file in the specified directory.
     *
     * @async
     *
     * @param { string } dirPath - Path to the directory where the file will be written.
     *
     * @param { Recipe | Recipe[] } recipe - The `Recipe` or `Array` of `Recipe`s to
     * serialize to a JSON file.
     *
     */
    export async function writeToDir(dirPath: string, recipe: Recipe | Recipe[]) {
        const str = JSON.stringify(recipe, null, 4)
        const fileName = Array.isArray(recipe) ? "Recipes" : recipe.title
        await writeTextFile(`${dirPath}/${fileName}.json`, str)
    }
}

export default Recipes
