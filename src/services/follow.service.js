const { database } = require('firebase-admin');
const Follow = require('../models/followModel');
const User = require('../models/user.model');
const AppError = require('../utils/appError');
const createNotification = require('./notification.service').createNotification;
const { t } = require('../utils/i18n');


const followUser = async (currentUserId, targetUserId, lang) => {

  if (currentUserId === targetUserId) {
    throw new AppError(t(lang, 'YOU_CANNOT_FOLLOW_SELF'), 400);
  }

  const targetUser = await User.findById(targetUserId);

  if (!targetUser) {
    throw new AppError(t(lang, 'NOT_FOUND'), 404);
  }

  const alreadyExists = await Follow.exists({
    follower: currentUserId,
    following: targetUserId,
  });

  if (alreadyExists) {
    throw new AppError(t(lang, 'FOLLOW_ALREADY_EXISTS'), 400);
  }

  const status = targetUser.isPrivate
    ? 'pending'
    : 'accepted';

  const follow = await Follow.create({
    follower: currentUserId,
    following: targetUserId,
    status,
  });

  const sender = await User.findById(currentUserId).select('name');
  if (status === 'accepted') {
    await createNotification({
      recipient: targetUserId,
      title: t(lang, 'NEW_FOLLOWER'),
      type: 'new_follower',
      message: t(lang, 'NEW_FOLLOWER_NOTIFICATION', { name: sender.name }),
      data: { followerId: currentUserId },
    });
  }
  if(status === 'pending') {
    await createNotification({
      recipient: targetUserId,
      title: t(lang, 'NEW_FOLLOW_REQUEST'),
      type: 'new_follow_request',
      message: t(lang, 'NEW_FOLLOW_REQUEST_NOTIFICATION', { name: sender.name }),
      data: { followerId: currentUserId },
    });
  }


  return follow;
};

const unfollowUser = async (currentUserId, targetUserId, lang) => {

  const deletedFollow = await Follow.findOneAndDelete({
    follower: currentUserId,
    following: targetUserId,
  });

  if (!deletedFollow) {
    throw new AppError(t(lang, 'FOLLOW_REQUEST_NOT_FOUND'), 404);
  }

  return deletedFollow;
};

const acceptFollowRequest = async (
  currentUserId,
  followId,
  lang
) => {

  const follow = await Follow.findById(followId);

  if (!follow) {
    throw new AppError(t(lang, 'FOLLOW_REQUEST_NOT_FOUND'), 404);
  }

  if (follow.following.toString() !== currentUserId) {
    throw new AppError(t(lang, 'Unauthorized'), 403);
  }

  follow.status = 'accepted';

  await follow.save();

  const reciver = await User.findById(currentUserId).select('name');
  await createNotification({
    recipient: follow.follower,
    title: t(lang, 'FOLLOW_REQUEST_ACCEPTED'),
    type: 'follow_request_accepted',
    message: t(lang, 'FOLLOW_REQUEST_ACCEPTED_NOTIFICATION', { name: reciver.name }),
    data: { followerId: currentUserId },
  });

  return follow;
};

const rejectFollowRequest = async (
  currentUserId,
  followId,
  lang
) => {

  const follow = await Follow.findById(followId);

  if (!follow) {
    throw new AppError(t(lang, 'FOLLOW_REQUEST_NOT_FOUND'), 404);
  }

  if (follow.following.toString() !== currentUserId) {
    throw new AppError(t(lang, 'Unauthorized'), 403);
  }

  await follow.deleteOne();

  return true;
};

const getFollowers = async (userId, lang) => {

  const followers = await Follow.find({
    following: userId,
    status: 'accepted',
  }).populate(
    'follower',
    'name username'
  );

  return followers;
};

const getFollowing = async (userId, lang) => {

  const following = await Follow.find({
    follower: userId,
    status: 'accepted',
  }).populate(
    'following',
    'name username'
  );

  return following;
};

const getPendingFollowRequests = async (userId, lang) => {

  // console.log('Getting pending follow requests for user:', userId);
  const pendingRequests = await Follow.find({
    following: userId,
    status: 'pending',
  }).populate(
    'follower',
    'name username bio'
  ).sort({ createdAt: -1 });
  return pendingRequests;
};

module.exports = {
  followUser,
  unfollowUser,
  acceptFollowRequest,
  rejectFollowRequest,
  getFollowers,
  getFollowing,
  getPendingFollowRequests,
};