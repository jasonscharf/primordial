
declare var arguments;

const templateRoot = 'templates'
const templates = {
    client: `${templateRoot}/client.handlebars`,
    models: `${templateRoot}/models.handlebars`
}



const settings = {
    swaggerFile: `./src/swagger.json`,
    type: {
        outPutPath: `./dist/models.ts.unused`,
        //templateFile: templates.models,
        membersOptional: true,
    },
    operations: {
        outPutPath: `./dist/`,
        //templateFile: templates.client,
        ungroupedOperationsName: "ClientGenerated",
    }
};
module.exports = settings;