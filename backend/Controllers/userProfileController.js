const { getUserById, getUserTickets, getUserFavourites, getEventName,deleteUser } = require('../models/userProfile');
const auth = require('../authMIddleWare/authMiddleware');

const getUser = async (req, res) => {
    const userId = req.user?.id; // or req.userId depending on how your middleware sets it

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: no user ID found' });
    }

    try {
        const user = await getUserById(userId);
        const eventNames = await getEventName(userId);
        const tickets = await getUserTickets(userId);

        const eventNamesList = eventNames.map(event => event.event_name);

        res.json({
            name: user.name,
            email: user.email,
            eventNames: eventNamesList,
            tickets: tickets
        });
    } catch (err) {
        console.error('Error fetching user profile', err);
        res.status(500).json({ error: 'Error fetching user profile' });
    }
};

const deleteUserHandler =async(req,res)=>{
    try {
        const id = req.params.id;
        const isDeleted = await deleteUser(id);
        if (isDeleted) {
          res.status(200).json({ message: 'User deleted successfully' });
        } else {
          res.status(404).json({ message: 'User not found' });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
      }
}

module.exports = {getUser,deleteUser};
