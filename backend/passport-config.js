const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const User = require('./models/User');

module.exports = function(app) {
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize user ID to session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // ── LOCAL STRATEGY ──
  passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: 'No account with that email' });
        }
        
        // If user registered via Google only, they won't have a password set
        if (!user.password) {
          return done(null, false, { message: 'Please login using Google' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Incorrect password' });
        }
      } catch (err) {
        return done(err);
      }
    }
  ));

  // ── GOOGLE STRATEGY ──
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'PLACEHOLDER_CLIENT_SECRET',
      callbackURL: 'http://127.0.0.1:5000/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find existing user by Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Find by email (if they registered locally but now trying Google)
        if (profile.emails && profile.emails.length > 0) {
           user = await User.findOne({ email: profile.emails[0].value });
           if (user) {
             // Link the Google ID to the existing account
             user.googleId = profile.id;
             await user.save();
             return done(null, user);
           }
        }

        // Create new user record
        const newUser = new User({
          username: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          cart: []
        });

        await newUser.save();
        done(null, newUser);

      } catch (err) {
        return done(err, null);
      }
    }
  ));
};
