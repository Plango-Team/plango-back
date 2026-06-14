const User = require("../models/user.model");
const AppError = require("../utils/appError");
const catchAsync = require("express-async-handler");
const Follow = require("../models/followModel");
const { t } = require("../utils/i18n");

exports.getUsers = catchAsync(async (req, res) => {
  const users = await User.find();
  res.status(200).json({
    status: "success",
    numUser: users.length,
    data: {
      users,
    },
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const lang = req.lang;
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError(t(lang, 'NOT_FOUND'), 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

exports.createUser = catchAsync(async (req, res) => {
  const newUser = await User.create(req.body);
  res.status(201).json({
    status: "success",
    data: {
      user: newUser,
    },
  });
});

const filterObj = (obj , ...fields ) => {
    const newObj={};
    Object.keys(obj).forEach(el => {
        if(fields.includes(el)) newObj[el]=obj[el];
    });
    return newObj;
    
}

exports.updateMe = catchAsync(async (req, res, next) => {
  const lang = req.lang;

  const hasSensitiveFields = req.body.password || req.body.email || req.body.phone || req.body.username;

  if (hasSensitiveFields) {
    return next(
      new AppError(
        "Account credentials (username, email, phone, and password) must be updated through their dedicated security features.", 
        400
      )
    );
  }
  const filteredBody = filterObj(req.body, 'name', 'isPrivate', 'bio', 'location');
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });
  if (!updatedUser) {
    return next(new AppError(t(lang, 'USER_NOT_FOUND'), 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser.toSafeObject(),
    },
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const lang = req.lang;
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return next(new AppError(t(lang, 'NOT_FOUND'), 404));
  }
  res.status(200).json({
    status: "success",
  });
});


exports.searchUsers = catchAsync(async (req, res) => {
  const search = req.query.search.toString().trim();

  const users = await User.find({
    $or: [
      {
        name: {
          $regex: search,
          $options: 'i',
        },
      },

      {
        username: {
          $regex: search,
          $options: 'i',
        },
      },
    ],
  })
    .select('name username')
    .limit(20);

  const follows = await Follow.find({
    follower: req.user._id,
  });

  const followMap = new Map();

  follows.forEach((follow) => {

    followMap.set(
      follow.following.toString(),
      follow.status
    );
  });

  const usersWithStatus = users.map((user) => {

    const followStatus =
      followMap.get(user._id.toString()) || 'none';

    return {
      _id: user._id,

      name: user.name,

      username: user.username,

      followStatus,
    };
  });

  res.status(200).json({
    status: 'success',

    results: usersWithStatus.length,

    data: {
      users: usersWithStatus,
    },
  });
});

exports.getUserProfile = catchAsync(async (req, res , next) => {

  const user = await User.findById(req.params.id)
    .select(
      'name username bio isPrivate location'
    );

  if (!user) {
    return next(
      new AppError(t(req.user.lang, 'NOT_FOUND'), 404)
    );
  }

  const followersCount =
    await Follow.countDocuments({
      following: user._id,
      status: 'accepted',
    });

  const followingCount =
    await Follow.countDocuments({
      follower: user._id,
      status: 'accepted',
    });

  const follow = await Follow.findOne({
    follower: req.user._id,
    following: user._id,
  });

  const followStatus =
    follow?.status || 'none';

  const isFollower =
    followStatus === 'accepted';

  // private profile
  if (
    user.isPrivate &&
    !isFollower &&
    !user._id.equals(req.user._id)
  ) {

    return res.status(200).json({
      status: 'success',

      data: {
        user: {
          _id: user._id,

          name: user.name,

          username: user.username,

          bio: user.bio,

          isPrivate: true,

          followersCount,

          followingCount,

          followStatus,

          limitedProfile: true,
        },
      },
    });
  }

  // full profile
  res.status(200).json({
    status: 'success',

    data: {
      user: {
        ...user.toObject(),

        followersCount,

        followingCount,

        followStatus,

        limitedProfile: false,
      },
    },
  });
});
