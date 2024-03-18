const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const groupsTableName = process.env.GROUPS_TABLE;
const connectionsTableName = process.env.CONNECTIONS_TABLE;

exports.handler = async (event) => {
    const { groupId, userId } = JSON.parse(event.body);
    const connectionId = event.requestContext.connectionId;

    try {
        // Retrieve the group information from DynamoDB
        const groupResponse = await dynamoDb.get({
            TableName: groupsTableName,
            Key: { groupId },
        }).promise();

        const group = groupResponse.Item;

        // Check if the group exists
        if (!group) {
            return { statusCode: 404, body: JSON.stringify({ message: "Group not found.", action: 'joinChat' }) };
        }

        // Verify if the userId is included in the group's membersList
        if (!group.membersList.includes(userId)) {
            return { statusCode: 403, body: JSON.stringify({ message: "User is not a member of the group.", action: 'joinChat' }) };
        }

        // Proceed with adding the user to usersConnected list if the user is a member of the group
        const usersConnected = new Set(group.usersConnected || []);
        usersConnected.add(userId);

        // Update the group's usersConnected list in DynamoDB
        await dynamoDb.update({
            TableName: groupsTableName,
            Key: { groupId },
            UpdateExpression: "SET usersConnected = :usersConnected",
            ExpressionAttributeValues: {
                ':usersConnected': Array.from(usersConnected),
            },
        }).promise();

        // Optionally, add the connectionId, groupId, and userId to the connections table for tracking purposes
        await dynamoDb.put({
            TableName: connectionsTableName,
            Item: {
                connectionId: connectionId,
                groupId: groupId,
                userId: userId,
            }
        }).promise();

        return { statusCode: 200, body: JSON.stringify({ message: "User joined chat successfully.", action: 'joinChat' }) };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ message: "Failed to join chat", action: 'joinChat' }) };
    }
};
