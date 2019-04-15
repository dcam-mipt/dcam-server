/*eslint-disable no-unused-vars*/
const feathers = require('@feathersjs/feathers');
const app = feathers();

app.use('todos', {
    async get(name) {
        return {
            name,
            text: `You have to do ${name}`
        };
    }
});

async function getTodo(name) {
    const service = app.service('todos');
    const todo = await service.get(name);

    console.log(todo);
}

getTodo('dishes');
/*eslint-enable no-unused-vars*/