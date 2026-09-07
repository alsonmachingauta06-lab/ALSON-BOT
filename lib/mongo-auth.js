const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error('MONGODB_URI is not set');
}

const client = new MongoClient(uri);

async function useMongoAuthState(sessionId = 'main') {
    await client.connect();

    const collection = client
        .db('alsonbot')
        .collection(`session_${sessionId}`);

    const writeData = async (data, id) => {
        const doc = JSON.parse(
            JSON.stringify(data, BufferJSON.replacer)
        );

        await collection.updateOne(
            { _id: id },
            { $set: { doc } },
            { upsert: true }
        );
    };

    const readData = async (id) => {
        try {
            const found = await collection.findOne({ _id: id });

            if (!found) return null;

            return JSON.parse(
                JSON.stringify(found.doc),
                BufferJSON.reviver
            );
        } catch {
            return null;
        }
    };

    const removeData = async (id) => {
        try {
            await collection.deleteOne({ _id: id });
        } catch {}
    };

    const creds = (await readData('creds')) || initAuthCreds();

    return {
        state: {
            creds,

            keys: {
                get: async (type, ids) => {
                    const data = {};

                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);

                            if (
                                type === 'app-state-sync-key' &&
                                value
                            ) {
                                value =
                                    proto.Message.AppStateSyncKeyData.fromObject(
                                        value
                                    );
                            }

                            data[id] = value;
                        })
                    );

                    return data;
                },

                set: async (data) => {
                    const tasks = [];

                    for (const category of Object.keys(data)) {
                        for (const id of Object.keys(data[category])) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;

                            tasks.push(
                                value
                                    ? writeData(value, key)
                                    : removeData(key)
                            );
                        }
                    }

                    await Promise.all(tasks);
                }
            }
        },

        saveCreds: async () => {
            await writeData(creds, 'creds');
        }
    };
}

module.exports = { useMongoAuthState };
