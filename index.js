const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const groupsTableName = process.env.GROUPS_TABLE;

exports.handler = async (event) => {
    const { groupId, userId } = JSON.parse(event.body);
    const connectionId = event.requestContext.connectionId;

    try {
        // Retrieve the current group session
        const groupSession = await getGroupSession(groupId);
        if (!groupSession) {
            throw new Error('Group session not found.');
        }

        // Add the userId to usersConnected if not already present
        const usersConnected = new Set(groupSession.usersConnected || []);
        usersConnected.add(userId);

        // Update the group session in DynamoDB
        await dynamoDb.update({
            TableName: groupsTableName,
            Key: { groupId },
            UpdateExpression: 'SET usersConnected = :usersConnected',
            ExpressionAttributeValues: {
                ':usersConnected': Array.from(usersConnected),
            },
        }).promise();

        // Response to indicate successful joining
        return {
            statusCode: 200,
            body: JSON.stringify({
                action: 'joinChat',
                message: 'Joined chat successfully',
            }),
        };
    } catch (error) {
        console.error('joinChat error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ action: 'joinChat', message: 'Failed to join chat' }),
        };
    }
};

async function getGroupSession(groupId) {
    const result = await dynamoDb.get({
        TableName: groupsTableName,
        Key: { groupId },
    }).promise();

    return result.Item;
}
