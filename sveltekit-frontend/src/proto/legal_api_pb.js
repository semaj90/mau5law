/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader: $Writer = $protobuf.Writer: $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const legal = $root.legal = (() => {

    /**
     * Namespace legal.
     * @exports legal
     * @namespace
     */
    const legal = {};

    legal.api = (function() {

        /**
         * Namespace api.
         * @memberof legal
         * @namespace
         */
        const api = {};

        api.User = (function() {

            /**
             * Properties of a User.
             * @memberof legal.api
             * @interface IUser
             * @property {string|null} [id] User id
             * @property {string|null} [email] User email
             * @property {string|null} [name] User name
             * @property {Array.<string>|null} [roles] User roles
             * @property {google.protobuf.ITimestamp|null} [createdAt] User createdAt
             * @property {google.protobuf.ITimestamp|null} [updatedAt] User updatedAt
             * @property {legal.api.IUserPreferences|null} [preferences] User preferences
             */

            /**
             * Constructs a new User.
             * @memberof legal.api
             * @classdesc Represents a User.
             * @implements IUser
             * @constructor
             * @param {legal.api.IUser=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * User id.
             * @member {string} id
             * @memberof legal.api.User
             * @instance
             */
            User.prototype.id = "";

            /**
             * User email.
             * @member {string} email
             * @memberof legal.api.User
             * @instance
             */
            User.prototype.email = "";

            /**
             * User name.
             * @member {string} name
             * @memberof legal.api.User
             * @instance
             */
            User.prototype.name = "";

            /**
             * User roles.
             * @member {Array.<string>} roles
             * @memberof legal.api.User
             * @instance
             */
            User.prototype.roles = $util.emptyArray;

            /**
             * User createdAt.
             * @member {google.protobuf.ITimestamp|null|undefined} createdAt
             * @memberof legal.api.User
             * @instance
             */
            User.prototype.createdAt = null;

            /**
             * User updatedAt.
             * @member {google.protobuf.ITimestamp|null|undefined} updatedAt
             * @memberof legal.api.User
             * @instance
             */
            User.prototype.updatedAt = null;

            /**
             * User preferences.
             * @member {legal.api.IUserPreferences|null|undefined} preferences
             * @memberof legal.api.User
             * @instance
             */
            User.prototype.preferences = null;

            /**
             * Creates a new User instance using the specified properties.
             * @function create
             * @memberof legal.api.User
             * @static
             * @param {legal.api.IUser=} [properties] Properties to set
             * @returns {legal.api.User} User instance
             */
            User.create = function create(properties) {
                return new User(properties);
            };

            /**
             * Encodes the specified User message. Does not implicitly {@link legal.api.User.verify|verify} messages.
             * @function encode
             * @memberof legal.api.User
             * @static
             * @param {legal.api.IUser} message User message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            User.encode = undefined;
            },;

            /**
             * Encodes the specified User message, length delimited. Does not implicitly {@link legal.api.User.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.User
             * @static
             * @param {legal.api.IUser} message User message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            User.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a User message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.User
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.User} User
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            User.decode = undefined;
            },;

            /**
             * Decodes a User message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.User
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.User} User
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            User.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a User message.
             * @function verify
             * @memberof legal.api.User
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            User.verify = undefined;
            };

            /**
             * Creates a User message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.User
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.User} User
             */
            User.fromObject = undefined;
            };

            /**
             * Creates a plain object from a User message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.User
             * @static
             * @param {legal.api.User} message User
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            User.toObject = undefined;
            };

            /**
             * Converts this User to JSON.
             * @function toJSON
             * @memberof legal.api.User
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            User.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for User
             * @function getTypeUrl
             * @memberof legal.api.User
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            User.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.User";
            };

            return User;
        })();

        api.UserPreferences = (function() {

            /**
             * Properties of a UserPreferences.
             * @memberof legal.api
             * @interface IUserPreferences
             * @property {string|null} [theme] UserPreferences theme
             * @property {string|null} [language] UserPreferences language
             * @property {boolean|null} [notificationsEnabled] UserPreferences notificationsEnabled
             * @property {boolean|null} [analyticsOptIn] UserPreferences analyticsOptIn
             */

            /**
             * Constructs a new UserPreferences.
             * @memberof legal.api
             * @classdesc Represents a UserPreferences.
             * @implements IUserPreferences
             * @constructor
             * @param {legal.api.IUserPreferences=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * UserPreferences theme.
             * @member {string} theme
             * @memberof legal.api.UserPreferences
             * @instance
             */
            UserPreferences.prototype.theme = "";

            /**
             * UserPreferences language.
             * @member {string} language
             * @memberof legal.api.UserPreferences
             * @instance
             */
            UserPreferences.prototype.language = "";

            /**
             * UserPreferences notificationsEnabled.
             * @member {boolean} notificationsEnabled
             * @memberof legal.api.UserPreferences
             * @instance
             */
            UserPreferences.prototype.notificationsEnabled = $state(false);

            /**
             * UserPreferences analyticsOptIn.
             * @member {boolean} analyticsOptIn
             * @memberof legal.api.UserPreferences
             * @instance
             */
            UserPreferences.prototype.analyticsOptIn = $state(false);

            /**
             * Creates a new UserPreferences instance using the specified properties.
             * @function create
             * @memberof legal.api.UserPreferences
             * @static
             * @param {legal.api.IUserPreferences=} [properties] Properties to set
             * @returns {legal.api.UserPreferences} UserPreferences instance
             */
            UserPreferences.create = function create(properties) {
                return new UserPreferences(properties);
            };

            /**
             * Encodes the specified UserPreferences message. Does not implicitly {@link legal.api.UserPreferences.verify|verify} messages.
             * @function encode
             * @memberof legal.api.UserPreferences
             * @static
             * @param {legal.api.IUserPreferences} message UserPreferences message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            UserPreferences.encode = undefined;
            };

            /**
             * Encodes the specified UserPreferences message, length delimited. Does not implicitly {@link legal.api.UserPreferences.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.UserPreferences
             * @static
             * @param {legal.api.IUserPreferences} message UserPreferences message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            UserPreferences.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a UserPreferences message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.UserPreferences
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.UserPreferences} UserPreferences
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            UserPreferences.decode = undefined;
            };

            /**
             * Decodes a UserPreferences message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.UserPreferences
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.UserPreferences} UserPreferences
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            UserPreferences.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a UserPreferences message.
             * @function verify
             * @memberof legal.api.UserPreferences
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            UserPreferences.verify = undefined;
            };

            /**
             * Creates a UserPreferences message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.UserPreferences
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.UserPreferences} UserPreferences
             */
            UserPreferences.fromObject = undefined;
            };

            /**
             * Creates a plain object from a UserPreferences message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.UserPreferences
             * @static
             * @param {legal.api.UserPreferences} message UserPreferences
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            UserPreferences.toObject = undefined;
            };

            /**
             * Converts this UserPreferences to JSON.
             * @function toJSON
             * @memberof legal.api.UserPreferences
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            UserPreferences.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for UserPreferences
             * @function getTypeUrl
             * @memberof legal.api.UserPreferences
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            UserPreferences.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.UserPreferences";
            };

            return UserPreferences;
        })();

        api.AuthRequest = (function() {

            /**
             * Properties of an AuthRequest.
             * @memberof legal.api
             * @interface IAuthRequest
             * @property {string|null} [email] AuthRequest email
             * @property {string|null} [password] AuthRequest password
             * @property {boolean|null} [rememberMe] AuthRequest rememberMe
             * @property {string|null} [clientInfo] AuthRequest clientInfo
             */

            /**
             * Constructs a new AuthRequest.
             * @memberof legal.api
             * @classdesc Represents an AuthRequest.
             * @implements IAuthRequest
             * @constructor
             * @param {legal.api.IAuthRequest=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * AuthRequest email.
             * @member {string} email
             * @memberof legal.api.AuthRequest
             * @instance
             */
            AuthRequest.prototype.email = "";

            /**
             * AuthRequest password.
             * @member {string} password
             * @memberof legal.api.AuthRequest
             * @instance
             */
            AuthRequest.prototype.password = "";

            /**
             * AuthRequest rememberMe.
             * @member {boolean} rememberMe
             * @memberof legal.api.AuthRequest
             * @instance
             */
            AuthRequest.prototype.rememberMe = $state(false);

            /**
             * AuthRequest clientInfo.
             * @member {string} clientInfo
             * @memberof legal.api.AuthRequest
             * @instance
             */
            AuthRequest.prototype.clientInfo = "";

            /**
             * Creates a new AuthRequest instance using the specified properties.
             * @function create
             * @memberof legal.api.AuthRequest
             * @static
             * @param {legal.api.IAuthRequest=} [properties] Properties to set
             * @returns {legal.api.AuthRequest} AuthRequest instance
             */
            AuthRequest.create = function create(properties) {
                return new AuthRequest(properties);
            };

            /**
             * Encodes the specified AuthRequest message. Does not implicitly {@link legal.api.AuthRequest.verify|verify} messages.
             * @function encode
             * @memberof legal.api.AuthRequest
             * @static
             * @param {legal.api.IAuthRequest} message AuthRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AuthRequest.encode = undefined;
            };

            /**
             * Encodes the specified AuthRequest message, length delimited. Does not implicitly {@link legal.api.AuthRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.AuthRequest
             * @static
             * @param {legal.api.IAuthRequest} message AuthRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AuthRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an AuthRequest message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.AuthRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.AuthRequest} AuthRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AuthRequest.decode = undefined;
            };

            /**
             * Decodes an AuthRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.AuthRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.AuthRequest} AuthRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AuthRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an AuthRequest message.
             * @function verify
             * @memberof legal.api.AuthRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            AuthRequest.verify = undefined;
            };

            /**
             * Creates an AuthRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.AuthRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.AuthRequest} AuthRequest
             */
            AuthRequest.fromObject = undefined;
            };

            /**
             * Creates a plain object from an AuthRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.AuthRequest
             * @static
             * @param {legal.api.AuthRequest} message AuthRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            AuthRequest.toObject = undefined;
            };

            /**
             * Converts this AuthRequest to JSON.
             * @function toJSON
             * @memberof legal.api.AuthRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            AuthRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for AuthRequest
             * @function getTypeUrl
             * @memberof legal.api.AuthRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            AuthRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.AuthRequest";
            };

            return AuthRequest;
        })();

        api.AuthResponse = (function() {

            /**
             * Properties of an AuthResponse.
             * @memberof legal.api
             * @interface IAuthResponse
             * @property {boolean|null} [success] AuthResponse success
             * @property {string|null} [token] AuthResponse token
             * @property {legal.api.IUser|null} [user] AuthResponse user
             * @property {string|null} [errorMessage] AuthResponse errorMessage
             * @property {number|Long|null} [expiresAt] AuthResponse expiresAt
             */

            /**
             * Constructs a new AuthResponse.
             * @memberof legal.api
             * @classdesc Represents an AuthResponse.
             * @implements IAuthResponse
             * @constructor
             * @param {legal.api.IAuthResponse=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * AuthResponse success.
             * @member {boolean} success
             * @memberof legal.api.AuthResponse
             * @instance
             */
            AuthResponse.prototype.success = $state(false);

            /**
             * AuthResponse token.
             * @member {string} token
             * @memberof legal.api.AuthResponse
             * @instance
             */
            AuthResponse.prototype.token = "";

            /**
             * AuthResponse user.
             * @member {legal.api.IUser|null|undefined} user
             * @memberof legal.api.AuthResponse
             * @instance
             */
            AuthResponse.prototype.user = null;

            /**
             * AuthResponse errorMessage.
             * @member {string} errorMessage
             * @memberof legal.api.AuthResponse
             * @instance
             */
            AuthResponse.prototype.errorMessage = "";

            /**
             * AuthResponse expiresAt.
             * @member {number|Long} expiresAt
             * @memberof legal.api.AuthResponse
             * @instance
             */
            AuthResponse.prototype.expiresAt = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Creates a new AuthResponse instance using the specified properties.
             * @function create
             * @memberof legal.api.AuthResponse
             * @static
             * @param {legal.api.IAuthResponse=} [properties] Properties to set
             * @returns {legal.api.AuthResponse} AuthResponse instance
             */
            AuthResponse.create = function create(properties) {
                return new AuthResponse(properties);
            };

            /**
             * Encodes the specified AuthResponse message. Does not implicitly {@link legal.api.AuthResponse.verify|verify} messages.
             * @function encode
             * @memberof legal.api.AuthResponse
             * @static
             * @param {legal.api.IAuthResponse} message AuthResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AuthResponse.encode = undefined;
            };

            /**
             * Encodes the specified AuthResponse message, length delimited. Does not implicitly {@link legal.api.AuthResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.AuthResponse
             * @static
             * @param {legal.api.IAuthResponse} message AuthResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AuthResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an AuthResponse message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.AuthResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.AuthResponse} AuthResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AuthResponse.decode = undefined;
            };

            /**
             * Decodes an AuthResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.AuthResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.AuthResponse} AuthResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AuthResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an AuthResponse message.
             * @function verify
             * @memberof legal.api.AuthResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            AuthResponse.verify = undefined;
            };

            /**
             * Creates an AuthResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.AuthResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.AuthResponse} AuthResponse
             */
            AuthResponse.fromObject = undefined;
            };

            /**
             * Creates a plain object from an AuthResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.AuthResponse
             * @static
             * @param {legal.api.AuthResponse} message AuthResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            AuthResponse.toObject = undefined;
            };

            /**
             * Converts this AuthResponse to JSON.
             * @function toJSON
             * @memberof legal.api.AuthResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            AuthResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for AuthResponse
             * @function getTypeUrl
             * @memberof legal.api.AuthResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            AuthResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.AuthResponse";
            };

            return AuthResponse;
        })();

        api.LegalDocument = (function() {

            /**
             * Properties of a LegalDocument.
             * @memberof legal.api
             * @interface ILegalDocument
             * @property {string|null} [id] LegalDocument id
             * @property {string|null} [title] LegalDocument title
             * @property {string|null} [content] LegalDocument content
             * @property {string|null} [fileUrl] LegalDocument fileUrl
             * @property {legal.api.DocumentType|null} [type] LegalDocument type
             * @property {Array.<string>|null} [tags] LegalDocument tags
             * @property {legal.api.IDocumentMetadata|null} [metadata] LegalDocument metadata
             * @property {google.protobuf.ITimestamp|null} [createdAt] LegalDocument createdAt
             * @property {google.protobuf.ITimestamp|null} [updatedAt] LegalDocument updatedAt
             * @property {string|null} [ownerId] LegalDocument ownerId
             * @property {Array.<string>|null} [collaboratorIds] LegalDocument collaboratorIds
             * @property {legal.api.DocumentStatus|null} [status] LegalDocument status
             * @property {legal.api.SecurityLevel|null} [securityLevel] LegalDocument securityLevel
             */

            /**
             * Constructs a new LegalDocument.
             * @memberof legal.api
             * @classdesc Represents a LegalDocument.
             * @implements ILegalDocument
             * @constructor
             * @param {legal.api.ILegalDocument=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * LegalDocument id.
             * @member {string} id
             * @memberof legal.api.LegalDocument
             * @instance
             */
            LegalDocument.prototype.id = "";

            /**
             * LegalDocument title.
             * @member {string} title
             * @memberof legal.api.LegalDocument
             * @instance
             */
            LegalDocument.prototype.title = "";

            /**
             * LegalDocument content.
             * @member {string} content
             * @memberof legal.api.LegalDocument
             * @instance
             */
            LegalDocument.prototype.content = "";

            /**
             * LegalDocument fileUrl.
             * @member {string} fileUrl
             * @memberof legal.api.LegalDocument
             * @instance
             */
            LegalDocument.prototype.fileUrl = "";

            /**
             * LegalDocument type.
             * @member {legal.api.DocumentType} type
             * @memberof legal.api.LegalDocument
             * @instance
             */
            LegalDocument.prototype.type = 0;

            /**
             * LegalDocument tags.
             * @member {Array.<string>} tags
             * @memberof legal.api.LegalDocument
             * @instance
             */
            LegalDocument.prototype.tags = $util.emptyArray;

            /**
             * LegalDocument metadata.
             * @member {legal.api.IDocumentMetadata|null|undefined} metadata
             * @memberof legal.api.LegalDocument
             * @instance
             */
            LegalDocument.prototype.metadata = null;

            /**
             * LegalDocument createdAt.
             * @member {google.protobuf.ITimestamp|null|undefined} createdAt
             * @memberof legal.api.LegalDocument
             * @instance
             */
            LegalDocument.prototype.createdAt = null;

            /**
             * LegalDocument updatedAt.
             * @member {google.protobuf.ITimestamp|null|undefined} updatedAt
             * @memberof legal.api.LegalDocument
             * @instance
             */
            LegalDocument.prototype.updatedAt = null;

            /**
             * LegalDocument ownerId.
             * @member {string} ownerId
             * @memberof legal.api.LegalDocument
             * @instance
             */
            LegalDocument.prototype.ownerId = "";

            /**
             * LegalDocument collaboratorIds.
             * @member {Array.<string>} collaboratorIds
             * @memberof legal.api.LegalDocument
             * @instance
             */
            LegalDocument.prototype.collaboratorIds = $util.emptyArray;

            /**
             * LegalDocument status.
             * @member {legal.api.DocumentStatus} status
             * @memberof legal.api.LegalDocument
             * @instance
             */
            LegalDocument.prototype.status = 0;

            /**
             * LegalDocument securityLevel.
             * @member {legal.api.SecurityLevel} securityLevel
             * @memberof legal.api.LegalDocument
             * @instance
             */
            LegalDocument.prototype.securityLevel = 0;

            /**
             * Creates a new LegalDocument instance using the specified properties.
             * @function create
             * @memberof legal.api.LegalDocument
             * @static
             * @param {legal.api.ILegalDocument=} [properties] Properties to set
             * @returns {legal.api.LegalDocument} LegalDocument instance
             */
            LegalDocument.create = function create(properties) {
                return new LegalDocument(properties);
            };

            /**
             * Encodes the specified LegalDocument message. Does not implicitly {@link legal.api.LegalDocument.verify|verify} messages.
             * @function encode
             * @memberof legal.api.LegalDocument
             * @static
             * @param {legal.api.ILegalDocument} message LegalDocument message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            LegalDocument.encode = undefined;
            };

            /**
             * Encodes the specified LegalDocument message, length delimited. Does not implicitly {@link legal.api.LegalDocument.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.LegalDocument
             * @static
             * @param {legal.api.ILegalDocument} message LegalDocument message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            LegalDocument.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a LegalDocument message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.LegalDocument
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.LegalDocument} LegalDocument
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            LegalDocument.decode = undefined;
            };

            /**
             * Decodes a LegalDocument message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.LegalDocument
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.LegalDocument} LegalDocument
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            LegalDocument.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a LegalDocument message.
             * @function verify
             * @memberof legal.api.LegalDocument
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            LegalDocument.verify = undefined;
            };

            /**
             * Creates a LegalDocument message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.LegalDocument
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.LegalDocument} LegalDocument
             */
            LegalDocument.fromObject = undefined;
            };

            /**
             * Creates a plain object from a LegalDocument message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.LegalDocument
             * @static
             * @param {legal.api.LegalDocument} message LegalDocument
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            LegalDocument.toObject = undefined;
            };

            /**
             * Converts this LegalDocument to JSON.
             * @function toJSON
             * @memberof legal.api.LegalDocument
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            LegalDocument.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for LegalDocument
             * @function getTypeUrl
             * @memberof legal.api.LegalDocument
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            LegalDocument.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.LegalDocument";
            };

            return LegalDocument;
        })();

        /**
         * DocumentType enum.
         * @name legal.api.DocumentType
         * @enum {number}
         * @property {number} DOCUMENT_TYPE_UNKNOWN=0 DOCUMENT_TYPE_UNKNOWN value
         * @property {number} DOCUMENT_TYPE_CONTRACT=1 DOCUMENT_TYPE_CONTRACT value
         * @property {number} DOCUMENT_TYPE_BRIEF=2 DOCUMENT_TYPE_BRIEF value
         * @property {number} DOCUMENT_TYPE_EVIDENCE=3 DOCUMENT_TYPE_EVIDENCE value
         * @property {number} DOCUMENT_TYPE_CITATION=4 DOCUMENT_TYPE_CITATION value
         * @property {number} DOCUMENT_TYPE_RULING=5 DOCUMENT_TYPE_RULING value
         * @property {number} DOCUMENT_TYPE_MOTION=6 DOCUMENT_TYPE_MOTION value
         * @property {number} DOCUMENT_TYPE_PLEADING=7 DOCUMENT_TYPE_PLEADING value
         * @property {number} DOCUMENT_TYPE_CORRESPONDENCE=8 DOCUMENT_TYPE_CORRESPONDENCE value
         */
        api.DocumentType = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "DOCUMENT_TYPE_UNKNOWN"] = 0;
            values[valuesById[1] = "DOCUMENT_TYPE_CONTRACT"] = 1;
            values[valuesById[2] = "DOCUMENT_TYPE_BRIEF"] = 2;
            values[valuesById[3] = "DOCUMENT_TYPE_EVIDENCE"] = 3;
            values[valuesById[4] = "DOCUMENT_TYPE_CITATION"] = 4;
            values[valuesById[5] = "DOCUMENT_TYPE_RULING"] = 5;
            values[valuesById[6] = "DOCUMENT_TYPE_MOTION"] = 6;
            values[valuesById[7] = "DOCUMENT_TYPE_PLEADING"] = 7;
            values[valuesById[8] = "DOCUMENT_TYPE_CORRESPONDENCE"] = 8;
            return values;
        })();

        /**
         * DocumentStatus enum.
         * @name legal.api.DocumentStatus
         * @enum {number}
         * @property {number} DOCUMENT_STATUS_DRAFT=0 DOCUMENT_STATUS_DRAFT value
         * @property {number} DOCUMENT_STATUS_REVIEW=1 DOCUMENT_STATUS_REVIEW value
         * @property {number} DOCUMENT_STATUS_APPROVED=2 DOCUMENT_STATUS_APPROVED value
         * @property {number} DOCUMENT_STATUS_ARCHIVED=3 DOCUMENT_STATUS_ARCHIVED value
         * @property {number} DOCUMENT_STATUS_DELETED=4 DOCUMENT_STATUS_DELETED value
         */
        api.DocumentStatus = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "DOCUMENT_STATUS_DRAFT"] = 0;
            values[valuesById[1] = "DOCUMENT_STATUS_REVIEW"] = 1;
            values[valuesById[2] = "DOCUMENT_STATUS_APPROVED"] = 2;
            values[valuesById[3] = "DOCUMENT_STATUS_ARCHIVED"] = 3;
            values[valuesById[4] = "DOCUMENT_STATUS_DELETED"] = 4;
            return values;
        })();

        /**
         * SecurityLevel enum.
         * @name legal.api.SecurityLevel
         * @enum {number}
         * @property {number} SECURITY_LEVEL_PUBLIC=0 SECURITY_LEVEL_PUBLIC value
         * @property {number} SECURITY_LEVEL_INTERNAL=1 SECURITY_LEVEL_INTERNAL value
         * @property {number} SECURITY_LEVEL_CONFIDENTIAL=2 SECURITY_LEVEL_CONFIDENTIAL value
         * @property {number} SECURITY_LEVEL_RESTRICTED=3 SECURITY_LEVEL_RESTRICTED value
         */
        api.SecurityLevel = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "SECURITY_LEVEL_PUBLIC"] = 0;
            values[valuesById[1] = "SECURITY_LEVEL_INTERNAL"] = 1;
            values[valuesById[2] = "SECURITY_LEVEL_CONFIDENTIAL"] = 2;
            values[valuesById[3] = "SECURITY_LEVEL_RESTRICTED"] = 3;
            return values;
        })();

        api.DocumentMetadata = (function() {

            /**
             * Properties of a DocumentMetadata.
             * @memberof legal.api
             * @interface IDocumentMetadata
             * @property {string|null} [jurisdiction] DocumentMetadata jurisdiction
             * @property {string|null} [courtLevel] DocumentMetadata courtLevel
             * @property {Array.<legal.api.IParty>|null} [parties] DocumentMetadata parties
             * @property {Array.<string>|null} [practiceAreas] DocumentMetadata practiceAreas
             * @property {number|null} [confidenceScore] DocumentMetadata confidenceScore
             * @property {string|null} [riskLevel] DocumentMetadata riskLevel
             * @property {Array.<string>|null} [keyTerms] DocumentMetadata keyTerms
             * @property {Array.<legal.api.ILegalCitation>|null} [citations] DocumentMetadata citations
             * @property {legal.api.ICaseInformation|null} [caseInfo] DocumentMetadata caseInfo
             */

            /**
             * Constructs a new DocumentMetadata.
             * @memberof legal.api
             * @classdesc Represents a DocumentMetadata.
             * @implements IDocumentMetadata
             * @constructor
             * @param {legal.api.IDocumentMetadata=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * DocumentMetadata jurisdiction.
             * @member {string} jurisdiction
             * @memberof legal.api.DocumentMetadata
             * @instance
             */
            DocumentMetadata.prototype.jurisdiction = "";

            /**
             * DocumentMetadata courtLevel.
             * @member {string} courtLevel
             * @memberof legal.api.DocumentMetadata
             * @instance
             */
            DocumentMetadata.prototype.courtLevel = "";

            /**
             * DocumentMetadata parties.
             * @member {Array.<legal.api.IParty>} parties
             * @memberof legal.api.DocumentMetadata
             * @instance
             */
            DocumentMetadata.prototype.parties = $util.emptyArray;

            /**
             * DocumentMetadata practiceAreas.
             * @member {Array.<string>} practiceAreas
             * @memberof legal.api.DocumentMetadata
             * @instance
             */
            DocumentMetadata.prototype.practiceAreas = $util.emptyArray;

            /**
             * DocumentMetadata confidenceScore.
             * @member {number} confidenceScore
             * @memberof legal.api.DocumentMetadata
             * @instance
             */
            DocumentMetadata.prototype.confidenceScore = 0;

            /**
             * DocumentMetadata riskLevel.
             * @member {string} riskLevel
             * @memberof legal.api.DocumentMetadata
             * @instance
             */
            DocumentMetadata.prototype.riskLevel = "";

            /**
             * DocumentMetadata keyTerms.
             * @member {Array.<string>} keyTerms
             * @memberof legal.api.DocumentMetadata
             * @instance
             */
            DocumentMetadata.prototype.keyTerms = $util.emptyArray;

            /**
             * DocumentMetadata citations.
             * @member {Array.<legal.api.ILegalCitation>} citations
             * @memberof legal.api.DocumentMetadata
             * @instance
             */
            DocumentMetadata.prototype.citations = $util.emptyArray;

            /**
             * DocumentMetadata caseInfo.
             * @member {legal.api.ICaseInformation|null|undefined} caseInfo
             * @memberof legal.api.DocumentMetadata
             * @instance
             */
            DocumentMetadata.prototype.caseInfo = null;

            /**
             * Creates a new DocumentMetadata instance using the specified properties.
             * @function create
             * @memberof legal.api.DocumentMetadata
             * @static
             * @param {legal.api.IDocumentMetadata=} [properties] Properties to set
             * @returns {legal.api.DocumentMetadata} DocumentMetadata instance
             */
            DocumentMetadata.create = function create(properties) {
                return new DocumentMetadata(properties);
            };

            /**
             * Encodes the specified DocumentMetadata message. Does not implicitly {@link legal.api.DocumentMetadata.verify|verify} messages.
             * @function encode
             * @memberof legal.api.DocumentMetadata
             * @static
             * @param {legal.api.IDocumentMetadata} message DocumentMetadata message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            DocumentMetadata.encode = undefined;
            };

            /**
             * Encodes the specified DocumentMetadata message, length delimited. Does not implicitly {@link legal.api.DocumentMetadata.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.DocumentMetadata
             * @static
             * @param {legal.api.IDocumentMetadata} message DocumentMetadata message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            DocumentMetadata.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a DocumentMetadata message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.DocumentMetadata
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.DocumentMetadata} DocumentMetadata
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            DocumentMetadata.decode = undefined;
            };

            /**
             * Decodes a DocumentMetadata message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.DocumentMetadata
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.DocumentMetadata} DocumentMetadata
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            DocumentMetadata.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a DocumentMetadata message.
             * @function verify
             * @memberof legal.api.DocumentMetadata
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            DocumentMetadata.verify = undefined;
            };

            /**
             * Creates a DocumentMetadata message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.DocumentMetadata
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.DocumentMetadata} DocumentMetadata
             */
            DocumentMetadata.fromObject = undefined;
            };

            /**
             * Creates a plain object from a DocumentMetadata message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.DocumentMetadata
             * @static
             * @param {legal.api.DocumentMetadata} message DocumentMetadata
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            DocumentMetadata.toObject = undefined;
            };

            /**
             * Converts this DocumentMetadata to JSON.
             * @function toJSON
             * @memberof legal.api.DocumentMetadata
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            DocumentMetadata.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for DocumentMetadata
             * @function getTypeUrl
             * @memberof legal.api.DocumentMetadata
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            DocumentMetadata.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.DocumentMetadata";
            };

            return DocumentMetadata;
        })();

        api.Party = (function() {

            /**
             * Properties of a Party.
             * @memberof legal.api
             * @interface IParty
             * @property {string|null} [name] Party name
             * @property {string|null} [role] Party role
             * @property {string|null} [type] Party type
             * @property {legal.api.IContactInfo|null} [contact] Party contact
             */

            /**
             * Constructs a new Party.
             * @memberof legal.api
             * @classdesc Represents a Party.
             * @implements IParty
             * @constructor
             * @param {legal.api.IParty=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * Party name.
             * @member {string} name
             * @memberof legal.api.Party
             * @instance
             */
            Party.prototype.name = "";

            /**
             * Party role.
             * @member {string} role
             * @memberof legal.api.Party
             * @instance
             */
            Party.prototype.role = "";

            /**
             * Party type.
             * @member {string} type
             * @memberof legal.api.Party
             * @instance
             */
            Party.prototype.type = "";

            /**
             * Party contact.
             * @member {legal.api.IContactInfo|null|undefined} contact
             * @memberof legal.api.Party
             * @instance
             */
            Party.prototype.contact = null;

            /**
             * Creates a new Party instance using the specified properties.
             * @function create
             * @memberof legal.api.Party
             * @static
             * @param {legal.api.IParty=} [properties] Properties to set
             * @returns {legal.api.Party} Party instance
             */
            Party.create = function create(properties) {
                return new Party(properties);
            };

            /**
             * Encodes the specified Party message. Does not implicitly {@link legal.api.Party.verify|verify} messages.
             * @function encode
             * @memberof legal.api.Party
             * @static
             * @param {legal.api.IParty} message Party message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Party.encode = undefined;
            };

            /**
             * Encodes the specified Party message, length delimited. Does not implicitly {@link legal.api.Party.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.Party
             * @static
             * @param {legal.api.IParty} message Party message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Party.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Party message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.Party
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.Party} Party
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Party.decode = undefined;
            };

            /**
             * Decodes a Party message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.Party
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.Party} Party
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Party.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Party message.
             * @function verify
             * @memberof legal.api.Party
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Party.verify = undefined;
            };

            /**
             * Creates a Party message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.Party
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.Party} Party
             */
            Party.fromObject = undefined;
            };

            /**
             * Creates a plain object from a Party message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.Party
             * @static
             * @param {legal.api.Party} message Party
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Party.toObject = undefined;
            };

            /**
             * Converts this Party to JSON.
             * @function toJSON
             * @memberof legal.api.Party
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Party.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Party
             * @function getTypeUrl
             * @memberof legal.api.Party
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Party.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.Party";
            };

            return Party;
        })();

        api.ContactInfo = (function() {

            /**
             * Properties of a ContactInfo.
             * @memberof legal.api
             * @interface IContactInfo
             * @property {string|null} [address] ContactInfo address
             * @property {string|null} [phone] ContactInfo phone
             * @property {string|null} [email] ContactInfo email
             * @property {string|null} [lawFirm] ContactInfo lawFirm
             */

            /**
             * Constructs a new ContactInfo.
             * @memberof legal.api
             * @classdesc Represents a ContactInfo.
             * @implements IContactInfo
             * @constructor
             * @param {legal.api.IContactInfo=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * ContactInfo address.
             * @member {string} address
             * @memberof legal.api.ContactInfo
             * @instance
             */
            ContactInfo.prototype.address = "";

            /**
             * ContactInfo phone.
             * @member {string} phone
             * @memberof legal.api.ContactInfo
             * @instance
             */
            ContactInfo.prototype.phone = "";

            /**
             * ContactInfo email.
             * @member {string} email
             * @memberof legal.api.ContactInfo
             * @instance
             */
            ContactInfo.prototype.email = "";

            /**
             * ContactInfo lawFirm.
             * @member {string} lawFirm
             * @memberof legal.api.ContactInfo
             * @instance
             */
            ContactInfo.prototype.lawFirm = "";

            /**
             * Creates a new ContactInfo instance using the specified properties.
             * @function create
             * @memberof legal.api.ContactInfo
             * @static
             * @param {legal.api.IContactInfo=} [properties] Properties to set
             * @returns {legal.api.ContactInfo} ContactInfo instance
             */
            ContactInfo.create = function create(properties) {
                return new ContactInfo(properties);
            };

            /**
             * Encodes the specified ContactInfo message. Does not implicitly {@link legal.api.ContactInfo.verify|verify} messages.
             * @function encode
             * @memberof legal.api.ContactInfo
             * @static
             * @param {legal.api.IContactInfo} message ContactInfo message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ContactInfo.encode = undefined;
            };

            /**
             * Encodes the specified ContactInfo message, length delimited. Does not implicitly {@link legal.api.ContactInfo.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.ContactInfo
             * @static
             * @param {legal.api.IContactInfo} message ContactInfo message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ContactInfo.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ContactInfo message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.ContactInfo
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.ContactInfo} ContactInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ContactInfo.decode = undefined;
            };

            /**
             * Decodes a ContactInfo message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.ContactInfo
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.ContactInfo} ContactInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ContactInfo.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ContactInfo message.
             * @function verify
             * @memberof legal.api.ContactInfo
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ContactInfo.verify = undefined;
            };

            /**
             * Creates a ContactInfo message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.ContactInfo
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.ContactInfo} ContactInfo
             */
            ContactInfo.fromObject = undefined;
            };

            /**
             * Creates a plain object from a ContactInfo message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.ContactInfo
             * @static
             * @param {legal.api.ContactInfo} message ContactInfo
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ContactInfo.toObject = undefined;
            };

            /**
             * Converts this ContactInfo to JSON.
             * @function toJSON
             * @memberof legal.api.ContactInfo
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ContactInfo.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ContactInfo
             * @function getTypeUrl
             * @memberof legal.api.ContactInfo
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ContactInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.ContactInfo";
            };

            return ContactInfo;
        })();

        api.LegalCitation = (function() {

            /**
             * Properties of a LegalCitation.
             * @memberof legal.api
             * @interface ILegalCitation
             * @property {string|null} [citationText] LegalCitation citationText
             * @property {string|null} [source] LegalCitation source
             * @property {string|null} [url] LegalCitation url
             * @property {legal.api.CitationType|null} [type] LegalCitation type
             */

            /**
             * Constructs a new LegalCitation.
             * @memberof legal.api
             * @classdesc Represents a LegalCitation.
             * @implements ILegalCitation
             * @constructor
             * @param {legal.api.ILegalCitation=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * LegalCitation citationText.
             * @member {string} citationText
             * @memberof legal.api.LegalCitation
             * @instance
             */
            LegalCitation.prototype.citationText = "";

            /**
             * LegalCitation source.
             * @member {string} source
             * @memberof legal.api.LegalCitation
             * @instance
             */
            LegalCitation.prototype.source = "";

            /**
             * LegalCitation url.
             * @member {string} url
             * @memberof legal.api.LegalCitation
             * @instance
             */
            LegalCitation.prototype.url = "";

            /**
             * LegalCitation type.
             * @member {legal.api.CitationType} type
             * @memberof legal.api.LegalCitation
             * @instance
             */
            LegalCitation.prototype.type = 0;

            /**
             * Creates a new LegalCitation instance using the specified properties.
             * @function create
             * @memberof legal.api.LegalCitation
             * @static
             * @param {legal.api.ILegalCitation=} [properties] Properties to set
             * @returns {legal.api.LegalCitation} LegalCitation instance
             */
            LegalCitation.create = function create(properties) {
                return new LegalCitation(properties);
            };

            /**
             * Encodes the specified LegalCitation message. Does not implicitly {@link legal.api.LegalCitation.verify|verify} messages.
             * @function encode
             * @memberof legal.api.LegalCitation
             * @static
             * @param {legal.api.ILegalCitation} message LegalCitation message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            LegalCitation.encode = undefined;
            };

            /**
             * Encodes the specified LegalCitation message, length delimited. Does not implicitly {@link legal.api.LegalCitation.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.LegalCitation
             * @static
             * @param {legal.api.ILegalCitation} message LegalCitation message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            LegalCitation.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a LegalCitation message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.LegalCitation
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.LegalCitation} LegalCitation
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            LegalCitation.decode = undefined;
            };

            /**
             * Decodes a LegalCitation message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.LegalCitation
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.LegalCitation} LegalCitation
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            LegalCitation.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a LegalCitation message.
             * @function verify
             * @memberof legal.api.LegalCitation
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            LegalCitation.verify = undefined;
            };

            /**
             * Creates a LegalCitation message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.LegalCitation
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.LegalCitation} LegalCitation
             */
            LegalCitation.fromObject = undefined;
            };

            /**
             * Creates a plain object from a LegalCitation message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.LegalCitation
             * @static
             * @param {legal.api.LegalCitation} message LegalCitation
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            LegalCitation.toObject = undefined;
            };

            /**
             * Converts this LegalCitation to JSON.
             * @function toJSON
             * @memberof legal.api.LegalCitation
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            LegalCitation.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for LegalCitation
             * @function getTypeUrl
             * @memberof legal.api.LegalCitation
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            LegalCitation.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.LegalCitation";
            };

            return LegalCitation;
        })();

        /**
         * CitationType enum.
         * @name legal.api.CitationType
         * @enum {number}
         * @property {number} CITATION_TYPE_CASE_LAW=0 CITATION_TYPE_CASE_LAW value
         * @property {number} CITATION_TYPE_STATUTE=1 CITATION_TYPE_STATUTE value
         * @property {number} CITATION_TYPE_REGULATION=2 CITATION_TYPE_REGULATION value
         * @property {number} CITATION_TYPE_SECONDARY=3 CITATION_TYPE_SECONDARY value
         */
        api.CitationType = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "CITATION_TYPE_CASE_LAW"] = 0;
            values[valuesById[1] = "CITATION_TYPE_STATUTE"] = 1;
            values[valuesById[2] = "CITATION_TYPE_REGULATION"] = 2;
            values[valuesById[3] = "CITATION_TYPE_SECONDARY"] = 3;
            return values;
        })();

        api.CaseInformation = (function() {

            /**
             * Properties of a CaseInformation.
             * @memberof legal.api
             * @interface ICaseInformation
             * @property {string|null} [caseNumber] CaseInformation caseNumber
             * @property {string|null} [courtName] CaseInformation courtName
             * @property {google.protobuf.ITimestamp|null} [filingDate] CaseInformation filingDate
             * @property {legal.api.CaseStatus|null} [status] CaseInformation status
             * @property {Array.<string>|null} [judges] CaseInformation judges
             */

            /**
             * Constructs a new CaseInformation.
             * @memberof legal.api
             * @classdesc Represents a CaseInformation.
             * @implements ICaseInformation
             * @constructor
             * @param {legal.api.ICaseInformation=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * CaseInformation caseNumber.
             * @member {string} caseNumber
             * @memberof legal.api.CaseInformation
             * @instance
             */
            CaseInformation.prototype.caseNumber = "";

            /**
             * CaseInformation courtName.
             * @member {string} courtName
             * @memberof legal.api.CaseInformation
             * @instance
             */
            CaseInformation.prototype.courtName = "";

            /**
             * CaseInformation filingDate.
             * @member {google.protobuf.ITimestamp|null|undefined} filingDate
             * @memberof legal.api.CaseInformation
             * @instance
             */
            CaseInformation.prototype.filingDate = null;

            /**
             * CaseInformation status.
             * @member {legal.api.CaseStatus} status
             * @memberof legal.api.CaseInformation
             * @instance
             */
            CaseInformation.prototype.status = 0;

            /**
             * CaseInformation judges.
             * @member {Array.<string>} judges
             * @memberof legal.api.CaseInformation
             * @instance
             */
            CaseInformation.prototype.judges = $util.emptyArray;

            /**
             * Creates a new CaseInformation instance using the specified properties.
             * @function create
             * @memberof legal.api.CaseInformation
             * @static
             * @param {legal.api.ICaseInformation=} [properties] Properties to set
             * @returns {legal.api.CaseInformation} CaseInformation instance
             */
            CaseInformation.create = function create(properties) {
                return new CaseInformation(properties);
            };

            /**
             * Encodes the specified CaseInformation message. Does not implicitly {@link legal.api.CaseInformation.verify|verify} messages.
             * @function encode
             * @memberof legal.api.CaseInformation
             * @static
             * @param {legal.api.ICaseInformation} message CaseInformation message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            CaseInformation.encode = undefined;
            };

            /**
             * Encodes the specified CaseInformation message, length delimited. Does not implicitly {@link legal.api.CaseInformation.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.CaseInformation
             * @static
             * @param {legal.api.ICaseInformation} message CaseInformation message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            CaseInformation.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a CaseInformation message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.CaseInformation
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.CaseInformation} CaseInformation
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            CaseInformation.decode = undefined;
            };

            /**
             * Decodes a CaseInformation message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.CaseInformation
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.CaseInformation} CaseInformation
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            CaseInformation.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a CaseInformation message.
             * @function verify
             * @memberof legal.api.CaseInformation
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            CaseInformation.verify = undefined;
            };

            /**
             * Creates a CaseInformation message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.CaseInformation
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.CaseInformation} CaseInformation
             */
            CaseInformation.fromObject = undefined;
            };

            /**
             * Creates a plain object from a CaseInformation message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.CaseInformation
             * @static
             * @param {legal.api.CaseInformation} message CaseInformation
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            CaseInformation.toObject = undefined;
            };

            /**
             * Converts this CaseInformation to JSON.
             * @function toJSON
             * @memberof legal.api.CaseInformation
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            CaseInformation.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for CaseInformation
             * @function getTypeUrl
             * @memberof legal.api.CaseInformation
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            CaseInformation.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.CaseInformation";
            };

            return CaseInformation;
        })();

        /**
         * CaseStatus enum.
         * @name legal.api.CaseStatus
         * @enum {number}
         * @property {number} CASE_STATUS_PENDING=0 CASE_STATUS_PENDING value
         * @property {number} CASE_STATUS_ACTIVE=1 CASE_STATUS_ACTIVE value
         * @property {number} CASE_STATUS_SETTLED=2 CASE_STATUS_SETTLED value
         * @property {number} CASE_STATUS_DISMISSED=3 CASE_STATUS_DISMISSED value
         * @property {number} CASE_STATUS_DECIDED=4 CASE_STATUS_DECIDED value
         * @property {number} CASE_STATUS_APPEALED=5 CASE_STATUS_APPEALED value
         */
        api.CaseStatus = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "CASE_STATUS_PENDING"] = 0;
            values[valuesById[1] = "CASE_STATUS_ACTIVE"] = 1;
            values[valuesById[2] = "CASE_STATUS_SETTLED"] = 2;
            values[valuesById[3] = "CASE_STATUS_DISMISSED"] = 3;
            values[valuesById[4] = "CASE_STATUS_DECIDED"] = 4;
            values[valuesById[5] = "CASE_STATUS_APPEALED"] = 5;
            return values;
        })();

        api.SearchRequest = (function() {

            /**
             * Properties of a SearchRequest.
             * @memberof legal.api
             * @interface ISearchRequest
             * @property {string|null} [query] SearchRequest query
             * @property {Array.<legal.api.ISearchFilter>|null} [filters] SearchRequest filters
             * @property {number|null} [limit] SearchRequest limit
             * @property {number|null} [offset] SearchRequest offset
             * @property {legal.api.SearchType|null} [type] SearchRequest type
             * @property {boolean|null} [includeEmbeddings] SearchRequest includeEmbeddings
             * @property {legal.api.ISortOptions|null} [sort] SearchRequest sort
             * @property {string|null} [userId] SearchRequest userId
             */

            /**
             * Constructs a new SearchRequest.
             * @memberof legal.api
             * @classdesc Represents a SearchRequest.
             * @implements ISearchRequest
             * @constructor
             * @param {legal.api.ISearchRequest=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * SearchRequest query.
             * @member {string} query
             * @memberof legal.api.SearchRequest
             * @instance
             */
            SearchRequest.prototype.query = "";

            /**
             * SearchRequest filters.
             * @member {Array.<legal.api.ISearchFilter>} filters
             * @memberof legal.api.SearchRequest
             * @instance
             */
            SearchRequest.prototype.filters = $util.emptyArray;

            /**
             * SearchRequest limit.
             * @member {number} limit
             * @memberof legal.api.SearchRequest
             * @instance
             */
            SearchRequest.prototype.limit = 0;

            /**
             * SearchRequest offset.
             * @member {number} offset
             * @memberof legal.api.SearchRequest
             * @instance
             */
            SearchRequest.prototype.offset = 0;

            /**
             * SearchRequest type.
             * @member {legal.api.SearchType} type
             * @memberof legal.api.SearchRequest
             * @instance
             */
            SearchRequest.prototype.type = 0;

            /**
             * SearchRequest includeEmbeddings.
             * @member {boolean} includeEmbeddings
             * @memberof legal.api.SearchRequest
             * @instance
             */
            SearchRequest.prototype.includeEmbeddings = $state(false);

            /**
             * SearchRequest sort.
             * @member {legal.api.ISortOptions|null|undefined} sort
             * @memberof legal.api.SearchRequest
             * @instance
             */
            SearchRequest.prototype.sort = null;

            /**
             * SearchRequest userId.
             * @member {string} userId
             * @memberof legal.api.SearchRequest
             * @instance
             */
            SearchRequest.prototype.userId = "";

            /**
             * Creates a new SearchRequest instance using the specified properties.
             * @function create
             * @memberof legal.api.SearchRequest
             * @static
             * @param {legal.api.ISearchRequest=} [properties] Properties to set
             * @returns {legal.api.SearchRequest} SearchRequest instance
             */
            SearchRequest.create = function create(properties) {
                return new SearchRequest(properties);
            };

            /**
             * Encodes the specified SearchRequest message. Does not implicitly {@link legal.api.SearchRequest.verify|verify} messages.
             * @function encode
             * @memberof legal.api.SearchRequest
             * @static
             * @param {legal.api.ISearchRequest} message SearchRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SearchRequest.encode = undefined;
            };

            /**
             * Encodes the specified SearchRequest message, length delimited. Does not implicitly {@link legal.api.SearchRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.SearchRequest
             * @static
             * @param {legal.api.ISearchRequest} message SearchRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SearchRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a SearchRequest message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.SearchRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.SearchRequest} SearchRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SearchRequest.decode = undefined;
            };

            /**
             * Decodes a SearchRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.SearchRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.SearchRequest} SearchRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SearchRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SearchRequest message.
             * @function verify
             * @memberof legal.api.SearchRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SearchRequest.verify = undefined;
            };

            /**
             * Creates a SearchRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.SearchRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.SearchRequest} SearchRequest
             */
            SearchRequest.fromObject = undefined;
            };

            /**
             * Creates a plain object from a SearchRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.SearchRequest
             * @static
             * @param {legal.api.SearchRequest} message SearchRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SearchRequest.toObject = undefined;
            };

            /**
             * Converts this SearchRequest to JSON.
             * @function toJSON
             * @memberof legal.api.SearchRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SearchRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SearchRequest
             * @function getTypeUrl
             * @memberof legal.api.SearchRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SearchRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.SearchRequest";
            };

            return SearchRequest;
        })();

        api.SearchFilter = (function() {

            /**
             * Properties of a SearchFilter.
             * @memberof legal.api
             * @interface ISearchFilter
             * @property {string|null} [field] SearchFilter field
             * @property {string|null} [operator] SearchFilter operator
             * @property {Array.<string>|null} [values] SearchFilter values
             */

            /**
             * Constructs a new SearchFilter.
             * @memberof legal.api
             * @classdesc Represents a SearchFilter.
             * @implements ISearchFilter
             * @constructor
             * @param {legal.api.ISearchFilter=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * SearchFilter field.
             * @member {string} field
             * @memberof legal.api.SearchFilter
             * @instance
             */
            SearchFilter.prototype.field = "";

            /**
             * SearchFilter operator.
             * @member {string} operator
             * @memberof legal.api.SearchFilter
             * @instance
             */
            SearchFilter.prototype.operator = "";

            /**
             * SearchFilter values.
             * @member {Array.<string>} values
             * @memberof legal.api.SearchFilter
             * @instance
             */
            SearchFilter.prototype.values = $util.emptyArray;

            /**
             * Creates a new SearchFilter instance using the specified properties.
             * @function create
             * @memberof legal.api.SearchFilter
             * @static
             * @param {legal.api.ISearchFilter=} [properties] Properties to set
             * @returns {legal.api.SearchFilter} SearchFilter instance
             */
            SearchFilter.create = function create(properties) {
                return new SearchFilter(properties);
            };

            /**
             * Encodes the specified SearchFilter message. Does not implicitly {@link legal.api.SearchFilter.verify|verify} messages.
             * @function encode
             * @memberof legal.api.SearchFilter
             * @static
             * @param {legal.api.ISearchFilter} message SearchFilter message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SearchFilter.encode = undefined;
            };

            /**
             * Encodes the specified SearchFilter message, length delimited. Does not implicitly {@link legal.api.SearchFilter.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.SearchFilter
             * @static
             * @param {legal.api.ISearchFilter} message SearchFilter message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SearchFilter.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a SearchFilter message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.SearchFilter
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.SearchFilter} SearchFilter
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SearchFilter.decode = undefined;
            };

            /**
             * Decodes a SearchFilter message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.SearchFilter
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.SearchFilter} SearchFilter
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SearchFilter.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SearchFilter message.
             * @function verify
             * @memberof legal.api.SearchFilter
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SearchFilter.verify = undefined;
            };

            /**
             * Creates a SearchFilter message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.SearchFilter
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.SearchFilter} SearchFilter
             */
            SearchFilter.fromObject = undefined;
            };

            /**
             * Creates a plain object from a SearchFilter message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.SearchFilter
             * @static
             * @param {legal.api.SearchFilter} message SearchFilter
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SearchFilter.toObject = undefined;
            };

            /**
             * Converts this SearchFilter to JSON.
             * @function toJSON
             * @memberof legal.api.SearchFilter
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SearchFilter.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SearchFilter
             * @function getTypeUrl
             * @memberof legal.api.SearchFilter
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SearchFilter.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.SearchFilter";
            };

            return SearchFilter;
        })();

        api.SortOptions = (function() {

            /**
             * Properties of a SortOptions.
             * @memberof legal.api
             * @interface ISortOptions
             * @property {string|null} [field] SortOptions field
             * @property {boolean|null} [descending] SortOptions descending
             */

            /**
             * Constructs a new SortOptions.
             * @memberof legal.api
             * @classdesc Represents a SortOptions.
             * @implements ISortOptions
             * @constructor
             * @param {legal.api.ISortOptions=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * SortOptions field.
             * @member {string} field
             * @memberof legal.api.SortOptions
             * @instance
             */
            SortOptions.prototype.field = "";

            /**
             * SortOptions descending.
             * @member {boolean} descending
             * @memberof legal.api.SortOptions
             * @instance
             */
            SortOptions.prototype.descending = $state(false);

            /**
             * Creates a new SortOptions instance using the specified properties.
             * @function create
             * @memberof legal.api.SortOptions
             * @static
             * @param {legal.api.ISortOptions=} [properties] Properties to set
             * @returns {legal.api.SortOptions} SortOptions instance
             */
            SortOptions.create = function create(properties) {
                return new SortOptions(properties);
            };

            /**
             * Encodes the specified SortOptions message. Does not implicitly {@link legal.api.SortOptions.verify|verify} messages.
             * @function encode
             * @memberof legal.api.SortOptions
             * @static
             * @param {legal.api.ISortOptions} message SortOptions message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SortOptions.encode = undefined;
            };

            /**
             * Encodes the specified SortOptions message, length delimited. Does not implicitly {@link legal.api.SortOptions.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.SortOptions
             * @static
             * @param {legal.api.ISortOptions} message SortOptions message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SortOptions.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a SortOptions message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.SortOptions
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.SortOptions} SortOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SortOptions.decode = undefined;
            };

            /**
             * Decodes a SortOptions message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.SortOptions
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.SortOptions} SortOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SortOptions.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SortOptions message.
             * @function verify
             * @memberof legal.api.SortOptions
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SortOptions.verify = undefined;
            };

            /**
             * Creates a SortOptions message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.SortOptions
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.SortOptions} SortOptions
             */
            SortOptions.fromObject = undefined;
            };

            /**
             * Creates a plain object from a SortOptions message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.SortOptions
             * @static
             * @param {legal.api.SortOptions} message SortOptions
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SortOptions.toObject = undefined;
            };

            /**
             * Converts this SortOptions to JSON.
             * @function toJSON
             * @memberof legal.api.SortOptions
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SortOptions.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SortOptions
             * @function getTypeUrl
             * @memberof legal.api.SortOptions
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SortOptions.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.SortOptions";
            };

            return SortOptions;
        })();

        /**
         * SearchType enum.
         * @name legal.api.SearchType
         * @enum {number}
         * @property {number} SEARCH_TYPE_FULL_TEXT=0 SEARCH_TYPE_FULL_TEXT value
         * @property {number} SEARCH_TYPE_SEMANTIC=1 SEARCH_TYPE_SEMANTIC value
         * @property {number} SEARCH_TYPE_VECTOR=2 SEARCH_TYPE_VECTOR value
         * @property {number} SEARCH_TYPE_HYBRID=3 SEARCH_TYPE_HYBRID value
         * @property {number} SEARCH_TYPE_LEGAL_CITATION=4 SEARCH_TYPE_LEGAL_CITATION value
         */
        api.SearchType = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "SEARCH_TYPE_FULL_TEXT"] = 0;
            values[valuesById[1] = "SEARCH_TYPE_SEMANTIC"] = 1;
            values[valuesById[2] = "SEARCH_TYPE_VECTOR"] = 2;
            values[valuesById[3] = "SEARCH_TYPE_HYBRID"] = 3;
            values[valuesById[4] = "SEARCH_TYPE_LEGAL_CITATION"] = 4;
            return values;
        })();

        api.SearchResponse = (function() {

            /**
             * Properties of a SearchResponse.
             * @memberof legal.api
             * @interface ISearchResponse
             * @property {Array.<legal.api.ISearchResult>|null} [results] SearchResponse results
             * @property {number|null} [totalCount] SearchResponse totalCount
             * @property {number|null} [maxScore] SearchResponse maxScore
             * @property {string|null} [queryId] SearchResponse queryId
             * @property {number|null} [processingTimeMs] SearchResponse processingTimeMs
             * @property {legal.api.ISearchMetadata|null} [metadata] SearchResponse metadata
             */

            /**
             * Constructs a new SearchResponse.
             * @memberof legal.api
             * @classdesc Represents a SearchResponse.
             * @implements ISearchResponse
             * @constructor
             * @param {legal.api.ISearchResponse=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * SearchResponse results.
             * @member {Array.<legal.api.ISearchResult>} results
             * @memberof legal.api.SearchResponse
             * @instance
             */
            SearchResponse.prototype.results = $util.emptyArray;

            /**
             * SearchResponse totalCount.
             * @member {number} totalCount
             * @memberof legal.api.SearchResponse
             * @instance
             */
            SearchResponse.prototype.totalCount = 0;

            /**
             * SearchResponse maxScore.
             * @member {number} maxScore
             * @memberof legal.api.SearchResponse
             * @instance
             */
            SearchResponse.prototype.maxScore = 0;

            /**
             * SearchResponse queryId.
             * @member {string} queryId
             * @memberof legal.api.SearchResponse
             * @instance
             */
            SearchResponse.prototype.queryId = "";

            /**
             * SearchResponse processingTimeMs.
             * @member {number} processingTimeMs
             * @memberof legal.api.SearchResponse
             * @instance
             */
            SearchResponse.prototype.processingTimeMs = 0;

            /**
             * SearchResponse metadata.
             * @member {legal.api.ISearchMetadata|null|undefined} metadata
             * @memberof legal.api.SearchResponse
             * @instance
             */
            SearchResponse.prototype.metadata = null;

            /**
             * Creates a new SearchResponse instance using the specified properties.
             * @function create
             * @memberof legal.api.SearchResponse
             * @static
             * @param {legal.api.ISearchResponse=} [properties] Properties to set
             * @returns {legal.api.SearchResponse} SearchResponse instance
             */
            SearchResponse.create = function create(properties) {
                return new SearchResponse(properties);
            };

            /**
             * Encodes the specified SearchResponse message. Does not implicitly {@link legal.api.SearchResponse.verify|verify} messages.
             * @function encode
             * @memberof legal.api.SearchResponse
             * @static
             * @param {legal.api.ISearchResponse} message SearchResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SearchResponse.encode = undefined;
            };

            /**
             * Encodes the specified SearchResponse message, length delimited. Does not implicitly {@link legal.api.SearchResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.SearchResponse
             * @static
             * @param {legal.api.ISearchResponse} message SearchResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SearchResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a SearchResponse message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.SearchResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.SearchResponse} SearchResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SearchResponse.decode = undefined;
            };

            /**
             * Decodes a SearchResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.SearchResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.SearchResponse} SearchResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SearchResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SearchResponse message.
             * @function verify
             * @memberof legal.api.SearchResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SearchResponse.verify = undefined;
            };

            /**
             * Creates a SearchResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.SearchResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.SearchResponse} SearchResponse
             */
            SearchResponse.fromObject = undefined;
            };

            /**
             * Creates a plain object from a SearchResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.SearchResponse
             * @static
             * @param {legal.api.SearchResponse} message SearchResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SearchResponse.toObject = undefined;
            };

            /**
             * Converts this SearchResponse to JSON.
             * @function toJSON
             * @memberof legal.api.SearchResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SearchResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SearchResponse
             * @function getTypeUrl
             * @memberof legal.api.SearchResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SearchResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.SearchResponse";
            };

            return SearchResponse;
        })();

        api.SearchResult = (function() {

            /**
             * Properties of a SearchResult.
             * @memberof legal.api
             * @interface ISearchResult
             * @property {legal.api.ILegalDocument|null} [document] SearchResult document
             * @property {number|null} [score] SearchResult score
             * @property {Array.<string>|null} [highlights] SearchResult highlights
             * @property {legal.api.IVectorSimilarity|null} [similarity] SearchResult similarity
             * @property {string|null} [excerpt] SearchResult excerpt
             * @property {Array.<legal.api.ILegalCitation>|null} [relatedCitations] SearchResult relatedCitations
             */

            /**
             * Constructs a new SearchResult.
             * @memberof legal.api
             * @classdesc Represents a SearchResult.
             * @implements ISearchResult
             * @constructor
             * @param {legal.api.ISearchResult=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * SearchResult document.
             * @member {legal.api.ILegalDocument|null|undefined} document
             * @memberof legal.api.SearchResult
             * @instance
             */
            SearchResult.prototype.document = null;

            /**
             * SearchResult score.
             * @member {number} score
             * @memberof legal.api.SearchResult
             * @instance
             */
            SearchResult.prototype.score = 0;

            /**
             * SearchResult highlights.
             * @member {Array.<string>} highlights
             * @memberof legal.api.SearchResult
             * @instance
             */
            SearchResult.prototype.highlights = $util.emptyArray;

            /**
             * SearchResult similarity.
             * @member {legal.api.IVectorSimilarity|null|undefined} similarity
             * @memberof legal.api.SearchResult
             * @instance
             */
            SearchResult.prototype.similarity = null;

            /**
             * SearchResult excerpt.
             * @member {string} excerpt
             * @memberof legal.api.SearchResult
             * @instance
             */
            SearchResult.prototype.excerpt = "";

            /**
             * SearchResult relatedCitations.
             * @member {Array.<legal.api.ILegalCitation>} relatedCitations
             * @memberof legal.api.SearchResult
             * @instance
             */
            SearchResult.prototype.relatedCitations = $util.emptyArray;

            /**
             * Creates a new SearchResult instance using the specified properties.
             * @function create
             * @memberof legal.api.SearchResult
             * @static
             * @param {legal.api.ISearchResult=} [properties] Properties to set
             * @returns {legal.api.SearchResult} SearchResult instance
             */
            SearchResult.create = function create(properties) {
                return new SearchResult(properties);
            };

            /**
             * Encodes the specified SearchResult message. Does not implicitly {@link legal.api.SearchResult.verify|verify} messages.
             * @function encode
             * @memberof legal.api.SearchResult
             * @static
             * @param {legal.api.ISearchResult} message SearchResult message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SearchResult.encode = undefined;
            };

            /**
             * Encodes the specified SearchResult message, length delimited. Does not implicitly {@link legal.api.SearchResult.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.SearchResult
             * @static
             * @param {legal.api.ISearchResult} message SearchResult message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SearchResult.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a SearchResult message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.SearchResult
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.SearchResult} SearchResult
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SearchResult.decode = undefined;
            };

            /**
             * Decodes a SearchResult message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.SearchResult
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.SearchResult} SearchResult
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SearchResult.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SearchResult message.
             * @function verify
             * @memberof legal.api.SearchResult
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SearchResult.verify = undefined;
            };

            /**
             * Creates a SearchResult message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.SearchResult
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.SearchResult} SearchResult
             */
            SearchResult.fromObject = undefined;
            };

            /**
             * Creates a plain object from a SearchResult message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.SearchResult
             * @static
             * @param {legal.api.SearchResult} message SearchResult
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SearchResult.toObject = undefined;
            };

            /**
             * Converts this SearchResult to JSON.
             * @function toJSON
             * @memberof legal.api.SearchResult
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SearchResult.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SearchResult
             * @function getTypeUrl
             * @memberof legal.api.SearchResult
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SearchResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.SearchResult";
            };

            return SearchResult;
        })();

        api.VectorSimilarity = (function() {

            /**
             * Properties of a VectorSimilarity.
             * @memberof legal.api
             * @interface IVectorSimilarity
             * @property {number|null} [cosineSimilarity] VectorSimilarity cosineSimilarity
             * @property {number|null} [euclideanDistance] VectorSimilarity euclideanDistance
             * @property {number|null} [embeddingDimension] VectorSimilarity embeddingDimension
             * @property {string|null} [modelUsed] VectorSimilarity modelUsed
             */

            /**
             * Constructs a new VectorSimilarity.
             * @memberof legal.api
             * @classdesc Represents a VectorSimilarity.
             * @implements IVectorSimilarity
             * @constructor
             * @param {legal.api.IVectorSimilarity=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * VectorSimilarity cosineSimilarity.
             * @member {number} cosineSimilarity
             * @memberof legal.api.VectorSimilarity
             * @instance
             */
            VectorSimilarity.prototype.cosineSimilarity = 0;

            /**
             * VectorSimilarity euclideanDistance.
             * @member {number} euclideanDistance
             * @memberof legal.api.VectorSimilarity
             * @instance
             */
            VectorSimilarity.prototype.euclideanDistance = 0;

            /**
             * VectorSimilarity embeddingDimension.
             * @member {number} embeddingDimension
             * @memberof legal.api.VectorSimilarity
             * @instance
             */
            VectorSimilarity.prototype.embeddingDimension = 0;

            /**
             * VectorSimilarity modelUsed.
             * @member {string} modelUsed
             * @memberof legal.api.VectorSimilarity
             * @instance
             */
            VectorSimilarity.prototype.modelUsed = "";

            /**
             * Creates a new VectorSimilarity instance using the specified properties.
             * @function create
             * @memberof legal.api.VectorSimilarity
             * @static
             * @param {legal.api.IVectorSimilarity=} [properties] Properties to set
             * @returns {legal.api.VectorSimilarity} VectorSimilarity instance
             */
            VectorSimilarity.create = function create(properties) {
                return new VectorSimilarity(properties);
            };

            /**
             * Encodes the specified VectorSimilarity message. Does not implicitly {@link legal.api.VectorSimilarity.verify|verify} messages.
             * @function encode
             * @memberof legal.api.VectorSimilarity
             * @static
             * @param {legal.api.IVectorSimilarity} message VectorSimilarity message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            VectorSimilarity.encode = undefined;
            };

            /**
             * Encodes the specified VectorSimilarity message, length delimited. Does not implicitly {@link legal.api.VectorSimilarity.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.VectorSimilarity
             * @static
             * @param {legal.api.IVectorSimilarity} message VectorSimilarity message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            VectorSimilarity.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a VectorSimilarity message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.VectorSimilarity
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.VectorSimilarity} VectorSimilarity
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            VectorSimilarity.decode = undefined;
            };

            /**
             * Decodes a VectorSimilarity message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.VectorSimilarity
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.VectorSimilarity} VectorSimilarity
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            VectorSimilarity.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a VectorSimilarity message.
             * @function verify
             * @memberof legal.api.VectorSimilarity
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            VectorSimilarity.verify = undefined;
            };

            /**
             * Creates a VectorSimilarity message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.VectorSimilarity
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.VectorSimilarity} VectorSimilarity
             */
            VectorSimilarity.fromObject = undefined;
            };

            /**
             * Creates a plain object from a VectorSimilarity message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.VectorSimilarity
             * @static
             * @param {legal.api.VectorSimilarity} message VectorSimilarity
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            VectorSimilarity.toObject = undefined;
            };

            /**
             * Converts this VectorSimilarity to JSON.
             * @function toJSON
             * @memberof legal.api.VectorSimilarity
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            VectorSimilarity.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for VectorSimilarity
             * @function getTypeUrl
             * @memberof legal.api.VectorSimilarity
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            VectorSimilarity.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.VectorSimilarity";
            };

            return VectorSimilarity;
        })();

        api.SearchMetadata = (function() {

            /**
             * Properties of a SearchMetadata.
             * @memberof legal.api
             * @interface ISearchMetadata
             * @property {Array.<string>|null} [suggestedQueries] SearchMetadata suggestedQueries
             * @property {Array.<legal.api.ISearchFacet>|null} [facets] SearchMetadata facets
             * @property {boolean|null} [hasMoreResults] SearchMetadata hasMoreResults
             */

            /**
             * Constructs a new SearchMetadata.
             * @memberof legal.api
             * @classdesc Represents a SearchMetadata.
             * @implements ISearchMetadata
             * @constructor
             * @param {legal.api.ISearchMetadata=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * SearchMetadata suggestedQueries.
             * @member {Array.<string>} suggestedQueries
             * @memberof legal.api.SearchMetadata
             * @instance
             */
            SearchMetadata.prototype.suggestedQueries = $util.emptyArray;

            /**
             * SearchMetadata facets.
             * @member {Array.<legal.api.ISearchFacet>} facets
             * @memberof legal.api.SearchMetadata
             * @instance
             */
            SearchMetadata.prototype.facets = $util.emptyArray;

            /**
             * SearchMetadata hasMoreResults.
             * @member {boolean} hasMoreResults
             * @memberof legal.api.SearchMetadata
             * @instance
             */
            SearchMetadata.prototype.hasMoreResults = $state(false);

            /**
             * Creates a new SearchMetadata instance using the specified properties.
             * @function create
             * @memberof legal.api.SearchMetadata
             * @static
             * @param {legal.api.ISearchMetadata=} [properties] Properties to set
             * @returns {legal.api.SearchMetadata} SearchMetadata instance
             */
            SearchMetadata.create = function create(properties) {
                return new SearchMetadata(properties);
            };

            /**
             * Encodes the specified SearchMetadata message. Does not implicitly {@link legal.api.SearchMetadata.verify|verify} messages.
             * @function encode
             * @memberof legal.api.SearchMetadata
             * @static
             * @param {legal.api.ISearchMetadata} message SearchMetadata message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SearchMetadata.encode = undefined;
            };

            /**
             * Encodes the specified SearchMetadata message, length delimited. Does not implicitly {@link legal.api.SearchMetadata.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.SearchMetadata
             * @static
             * @param {legal.api.ISearchMetadata} message SearchMetadata message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SearchMetadata.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a SearchMetadata message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.SearchMetadata
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.SearchMetadata} SearchMetadata
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SearchMetadata.decode = undefined;
            };

            /**
             * Decodes a SearchMetadata message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.SearchMetadata
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.SearchMetadata} SearchMetadata
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SearchMetadata.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SearchMetadata message.
             * @function verify
             * @memberof legal.api.SearchMetadata
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SearchMetadata.verify = undefined;
            };

            /**
             * Creates a SearchMetadata message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.SearchMetadata
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.SearchMetadata} SearchMetadata
             */
            SearchMetadata.fromObject = undefined;
            };

            /**
             * Creates a plain object from a SearchMetadata message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.SearchMetadata
             * @static
             * @param {legal.api.SearchMetadata} message SearchMetadata
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SearchMetadata.toObject = undefined;
            };

            /**
             * Converts this SearchMetadata to JSON.
             * @function toJSON
             * @memberof legal.api.SearchMetadata
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SearchMetadata.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SearchMetadata
             * @function getTypeUrl
             * @memberof legal.api.SearchMetadata
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SearchMetadata.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.SearchMetadata";
            };

            return SearchMetadata;
        })();

        api.SearchFacet = (function() {

            /**
             * Properties of a SearchFacet.
             * @memberof legal.api
             * @interface ISearchFacet
             * @property {string|null} [field] SearchFacet field
             * @property {Array.<legal.api.IFacetValue>|null} [values] SearchFacet values
             */

            /**
             * Constructs a new SearchFacet.
             * @memberof legal.api
             * @classdesc Represents a SearchFacet.
             * @implements ISearchFacet
             * @constructor
             * @param {legal.api.ISearchFacet=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * SearchFacet field.
             * @member {string} field
             * @memberof legal.api.SearchFacet
             * @instance
             */
            SearchFacet.prototype.field = "";

            /**
             * SearchFacet values.
             * @member {Array.<legal.api.IFacetValue>} values
             * @memberof legal.api.SearchFacet
             * @instance
             */
            SearchFacet.prototype.values = $util.emptyArray;

            /**
             * Creates a new SearchFacet instance using the specified properties.
             * @function create
             * @memberof legal.api.SearchFacet
             * @static
             * @param {legal.api.ISearchFacet=} [properties] Properties to set
             * @returns {legal.api.SearchFacet} SearchFacet instance
             */
            SearchFacet.create = function create(properties) {
                return new SearchFacet(properties);
            };

            /**
             * Encodes the specified SearchFacet message. Does not implicitly {@link legal.api.SearchFacet.verify|verify} messages.
             * @function encode
             * @memberof legal.api.SearchFacet
             * @static
             * @param {legal.api.ISearchFacet} message SearchFacet message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SearchFacet.encode = undefined;
            };

            /**
             * Encodes the specified SearchFacet message, length delimited. Does not implicitly {@link legal.api.SearchFacet.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.SearchFacet
             * @static
             * @param {legal.api.ISearchFacet} message SearchFacet message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SearchFacet.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a SearchFacet message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.SearchFacet
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.SearchFacet} SearchFacet
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SearchFacet.decode = undefined;
            };

            /**
             * Decodes a SearchFacet message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.SearchFacet
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.SearchFacet} SearchFacet
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SearchFacet.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SearchFacet message.
             * @function verify
             * @memberof legal.api.SearchFacet
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SearchFacet.verify = undefined;
            };

            /**
             * Creates a SearchFacet message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.SearchFacet
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.SearchFacet} SearchFacet
             */
            SearchFacet.fromObject = undefined;
            };

            /**
             * Creates a plain object from a SearchFacet message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.SearchFacet
             * @static
             * @param {legal.api.SearchFacet} message SearchFacet
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SearchFacet.toObject = undefined;
            };

            /**
             * Converts this SearchFacet to JSON.
             * @function toJSON
             * @memberof legal.api.SearchFacet
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SearchFacet.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SearchFacet
             * @function getTypeUrl
             * @memberof legal.api.SearchFacet
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SearchFacet.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.SearchFacet";
            };

            return SearchFacet;
        })();

        api.FacetValue = (function() {

            /**
             * Properties of a FacetValue.
             * @memberof legal.api
             * @interface IFacetValue
             * @property {string|null} [value] FacetValue value
             * @property {number|null} [count] FacetValue count
             */

            /**
             * Constructs a new FacetValue.
             * @memberof legal.api
             * @classdesc Represents a FacetValue.
             * @implements IFacetValue
             * @constructor
             * @param {legal.api.IFacetValue=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * FacetValue value.
             * @member {string} value
             * @memberof legal.api.FacetValue
             * @instance
             */
            FacetValue.prototype.value = "";

            /**
             * FacetValue count.
             * @member {number} count
             * @memberof legal.api.FacetValue
             * @instance
             */
            FacetValue.prototype.count = 0;

            /**
             * Creates a new FacetValue instance using the specified properties.
             * @function create
             * @memberof legal.api.FacetValue
             * @static
             * @param {legal.api.IFacetValue=} [properties] Properties to set
             * @returns {legal.api.FacetValue} FacetValue instance
             */
            FacetValue.create = function create(properties) {
                return new FacetValue(properties);
            };

            /**
             * Encodes the specified FacetValue message. Does not implicitly {@link legal.api.FacetValue.verify|verify} messages.
             * @function encode
             * @memberof legal.api.FacetValue
             * @static
             * @param {legal.api.IFacetValue} message FacetValue message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            FacetValue.encode = undefined;
            };

            /**
             * Encodes the specified FacetValue message, length delimited. Does not implicitly {@link legal.api.FacetValue.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.FacetValue
             * @static
             * @param {legal.api.IFacetValue} message FacetValue message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            FacetValue.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a FacetValue message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.FacetValue
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.FacetValue} FacetValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            FacetValue.decode = undefined;
            };

            /**
             * Decodes a FacetValue message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.FacetValue
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.FacetValue} FacetValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            FacetValue.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a FacetValue message.
             * @function verify
             * @memberof legal.api.FacetValue
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            FacetValue.verify = undefined;
            };

            /**
             * Creates a FacetValue message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.FacetValue
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.FacetValue} FacetValue
             */
            FacetValue.fromObject = undefined;
            };

            /**
             * Creates a plain object from a FacetValue message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.FacetValue
             * @static
             * @param {legal.api.FacetValue} message FacetValue
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            FacetValue.toObject = undefined;
            };

            /**
             * Converts this FacetValue to JSON.
             * @function toJSON
             * @memberof legal.api.FacetValue
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            FacetValue.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for FacetValue
             * @function getTypeUrl
             * @memberof legal.api.FacetValue
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            FacetValue.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.FacetValue";
            };

            return FacetValue;
        })();

        api.ChatMessage = (function() {

            /**
             * Properties of a ChatMessage.
             * @memberof legal.api
             * @interface IChatMessage
             * @property {string|null} [id] ChatMessage id
             * @property {string|null} [sessionId] ChatMessage sessionId
             * @property {string|null} [userId] ChatMessage userId
             * @property {string|null} [content] ChatMessage content
             * @property {legal.api.MessageType|null} [type] ChatMessage type
             * @property {Array.<legal.api.IAttachment>|null} [attachments] ChatMessage attachments
             * @property {google.protobuf.ITimestamp|null} [timestamp] ChatMessage timestamp
             * @property {legal.api.IMessageMetadata|null} [metadata] ChatMessage metadata
             */

            /**
             * Constructs a new ChatMessage.
             * @memberof legal.api
             * @classdesc Represents a ChatMessage.
             * @implements IChatMessage
             * @constructor
             * @param {legal.api.IChatMessage=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * ChatMessage id.
             * @member {string} id
             * @memberof legal.api.ChatMessage
             * @instance
             */
            ChatMessage.prototype.id = "";

            /**
             * ChatMessage sessionId.
             * @member {string} sessionId
             * @memberof legal.api.ChatMessage
             * @instance
             */
            ChatMessage.prototype.sessionId = "";

            /**
             * ChatMessage userId.
             * @member {string} userId
             * @memberof legal.api.ChatMessage
             * @instance
             */
            ChatMessage.prototype.userId = "";

            /**
             * ChatMessage content.
             * @member {string} content
             * @memberof legal.api.ChatMessage
             * @instance
             */
            ChatMessage.prototype.content = "";

            /**
             * ChatMessage type.
             * @member {legal.api.MessageType} type
             * @memberof legal.api.ChatMessage
             * @instance
             */
            ChatMessage.prototype.type = 0;

            /**
             * ChatMessage attachments.
             * @member {Array.<legal.api.IAttachment>} attachments
             * @memberof legal.api.ChatMessage
             * @instance
             */
            ChatMessage.prototype.attachments = $util.emptyArray;

            /**
             * ChatMessage timestamp.
             * @member {google.protobuf.ITimestamp|null|undefined} timestamp
             * @memberof legal.api.ChatMessage
             * @instance
             */
            ChatMessage.prototype.timestamp = null;

            /**
             * ChatMessage metadata.
             * @member {legal.api.IMessageMetadata|null|undefined} metadata
             * @memberof legal.api.ChatMessage
             * @instance
             */
            ChatMessage.prototype.metadata = null;

            /**
             * Creates a new ChatMessage instance using the specified properties.
             * @function create
             * @memberof legal.api.ChatMessage
             * @static
             * @param {legal.api.IChatMessage=} [properties] Properties to set
             * @returns {legal.api.ChatMessage} ChatMessage instance
             */
            ChatMessage.create = function create(properties) {
                return new ChatMessage(properties);
            };

            /**
             * Encodes the specified ChatMessage message. Does not implicitly {@link legal.api.ChatMessage.verify|verify} messages.
             * @function encode
             * @memberof legal.api.ChatMessage
             * @static
             * @param {legal.api.IChatMessage} message ChatMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ChatMessage.encode = undefined;
            };

            /**
             * Encodes the specified ChatMessage message, length delimited. Does not implicitly {@link legal.api.ChatMessage.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.ChatMessage
             * @static
             * @param {legal.api.IChatMessage} message ChatMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ChatMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ChatMessage message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.ChatMessage
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.ChatMessage} ChatMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ChatMessage.decode = undefined;
            };

            /**
             * Decodes a ChatMessage message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.ChatMessage
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.ChatMessage} ChatMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ChatMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ChatMessage message.
             * @function verify
             * @memberof legal.api.ChatMessage
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ChatMessage.verify = undefined;
            };

            /**
             * Creates a ChatMessage message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.ChatMessage
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.ChatMessage} ChatMessage
             */
            ChatMessage.fromObject = undefined;
            };

            /**
             * Creates a plain object from a ChatMessage message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.ChatMessage
             * @static
             * @param {legal.api.ChatMessage} message ChatMessage
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ChatMessage.toObject = undefined;
            };

            /**
             * Converts this ChatMessage to JSON.
             * @function toJSON
             * @memberof legal.api.ChatMessage
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ChatMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ChatMessage
             * @function getTypeUrl
             * @memberof legal.api.ChatMessage
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ChatMessage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.ChatMessage";
            };

            return ChatMessage;
        })();

        /**
         * MessageType enum.
         * @name legal.api.MessageType
         * @enum {number}
         * @property {number} MESSAGE_TYPE_USER=0 MESSAGE_TYPE_USER value
         * @property {number} MESSAGE_TYPE_ASSISTANT=1 MESSAGE_TYPE_ASSISTANT value
         * @property {number} MESSAGE_TYPE_SYSTEM=2 MESSAGE_TYPE_SYSTEM value
         * @property {number} MESSAGE_TYPE_ERROR=3 MESSAGE_TYPE_ERROR value
         * @property {number} MESSAGE_TYPE_FUNCTION_CALL=4 MESSAGE_TYPE_FUNCTION_CALL value
         */
        api.MessageType = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "MESSAGE_TYPE_USER"] = 0;
            values[valuesById[1] = "MESSAGE_TYPE_ASSISTANT"] = 1;
            values[valuesById[2] = "MESSAGE_TYPE_SYSTEM"] = 2;
            values[valuesById[3] = "MESSAGE_TYPE_ERROR"] = 3;
            values[valuesById[4] = "MESSAGE_TYPE_FUNCTION_CALL"] = 4;
            return values;
        })();

        api.MessageMetadata = (function() {

            /**
             * Properties of a MessageMetadata.
             * @memberof legal.api
             * @interface IMessageMetadata
             * @property {string|null} [modelUsed] MessageMetadata modelUsed
             * @property {number|null} [tokensUsed] MessageMetadata tokensUsed
             * @property {number|null} [processingTimeMs] MessageMetadata processingTimeMs
             * @property {Array.<string>|null} [sourceDocuments] MessageMetadata sourceDocuments
             * @property {number|null} [confidenceScore] MessageMetadata confidenceScore
             */

            /**
             * Constructs a new MessageMetadata.
             * @memberof legal.api
             * @classdesc Represents a MessageMetadata.
             * @implements IMessageMetadata
             * @constructor
             * @param {legal.api.IMessageMetadata=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * MessageMetadata modelUsed.
             * @member {string} modelUsed
             * @memberof legal.api.MessageMetadata
             * @instance
             */
            MessageMetadata.prototype.modelUsed = "";

            /**
             * MessageMetadata tokensUsed.
             * @member {number} tokensUsed
             * @memberof legal.api.MessageMetadata
             * @instance
             */
            MessageMetadata.prototype.tokensUsed = 0;

            /**
             * MessageMetadata processingTimeMs.
             * @member {number} processingTimeMs
             * @memberof legal.api.MessageMetadata
             * @instance
             */
            MessageMetadata.prototype.processingTimeMs = 0;

            /**
             * MessageMetadata sourceDocuments.
             * @member {Array.<string>} sourceDocuments
             * @memberof legal.api.MessageMetadata
             * @instance
             */
            MessageMetadata.prototype.sourceDocuments = $util.emptyArray;

            /**
             * MessageMetadata confidenceScore.
             * @member {number} confidenceScore
             * @memberof legal.api.MessageMetadata
             * @instance
             */
            MessageMetadata.prototype.confidenceScore = 0;

            /**
             * Creates a new MessageMetadata instance using the specified properties.
             * @function create
             * @memberof legal.api.MessageMetadata
             * @static
             * @param {legal.api.IMessageMetadata=} [properties] Properties to set
             * @returns {legal.api.MessageMetadata} MessageMetadata instance
             */
            MessageMetadata.create = function create(properties) {
                return new MessageMetadata(properties);
            };

            /**
             * Encodes the specified MessageMetadata message. Does not implicitly {@link legal.api.MessageMetadata.verify|verify} messages.
             * @function encode
             * @memberof legal.api.MessageMetadata
             * @static
             * @param {legal.api.IMessageMetadata} message MessageMetadata message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            MessageMetadata.encode = undefined;
            };

            /**
             * Encodes the specified MessageMetadata message, length delimited. Does not implicitly {@link legal.api.MessageMetadata.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.MessageMetadata
             * @static
             * @param {legal.api.IMessageMetadata} message MessageMetadata message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            MessageMetadata.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a MessageMetadata message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.MessageMetadata
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.MessageMetadata} MessageMetadata
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            MessageMetadata.decode = undefined;
            };

            /**
             * Decodes a MessageMetadata message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.MessageMetadata
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.MessageMetadata} MessageMetadata
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            MessageMetadata.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a MessageMetadata message.
             * @function verify
             * @memberof legal.api.MessageMetadata
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            MessageMetadata.verify = undefined;
            };

            /**
             * Creates a MessageMetadata message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.MessageMetadata
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.MessageMetadata} MessageMetadata
             */
            MessageMetadata.fromObject = undefined;
            };

            /**
             * Creates a plain object from a MessageMetadata message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.MessageMetadata
             * @static
             * @param {legal.api.MessageMetadata} message MessageMetadata
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            MessageMetadata.toObject = undefined;
            };

            /**
             * Converts this MessageMetadata to JSON.
             * @function toJSON
             * @memberof legal.api.MessageMetadata
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            MessageMetadata.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for MessageMetadata
             * @function getTypeUrl
             * @memberof legal.api.MessageMetadata
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            MessageMetadata.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.MessageMetadata";
            };

            return MessageMetadata;
        })();

        api.ChatRequest = (function() {

            /**
             * Properties of a ChatRequest.
             * @memberof legal.api
             * @interface IChatRequest
             * @property {string|null} [sessionId] ChatRequest sessionId
             * @property {string|null} [userId] ChatRequest userId
             * @property {string|null} [message] ChatRequest message
             * @property {legal.api.IChatContext|null} [context] ChatRequest context
             * @property {legal.api.IChatOptions|null} [options] ChatRequest options
             */

            /**
             * Constructs a new ChatRequest.
             * @memberof legal.api
             * @classdesc Represents a ChatRequest.
             * @implements IChatRequest
             * @constructor
             * @param {legal.api.IChatRequest=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * ChatRequest sessionId.
             * @member {string} sessionId
             * @memberof legal.api.ChatRequest
             * @instance
             */
            ChatRequest.prototype.sessionId = "";

            /**
             * ChatRequest userId.
             * @member {string} userId
             * @memberof legal.api.ChatRequest
             * @instance
             */
            ChatRequest.prototype.userId = "";

            /**
             * ChatRequest message.
             * @member {string} message
             * @memberof legal.api.ChatRequest
             * @instance
             */
            ChatRequest.prototype.message = "";

            /**
             * ChatRequest context.
             * @member {legal.api.IChatContext|null|undefined} context
             * @memberof legal.api.ChatRequest
             * @instance
             */
            ChatRequest.prototype.context = null;

            /**
             * ChatRequest options.
             * @member {legal.api.IChatOptions|null|undefined} options
             * @memberof legal.api.ChatRequest
             * @instance
             */
            ChatRequest.prototype.options = null;

            /**
             * Creates a new ChatRequest instance using the specified properties.
             * @function create
             * @memberof legal.api.ChatRequest
             * @static
             * @param {legal.api.IChatRequest=} [properties] Properties to set
             * @returns {legal.api.ChatRequest} ChatRequest instance
             */
            ChatRequest.create = function create(properties) {
                return new ChatRequest(properties);
            };

            /**
             * Encodes the specified ChatRequest message. Does not implicitly {@link legal.api.ChatRequest.verify|verify} messages.
             * @function encode
             * @memberof legal.api.ChatRequest
             * @static
             * @param {legal.api.IChatRequest} message ChatRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ChatRequest.encode = undefined;
            };

            /**
             * Encodes the specified ChatRequest message, length delimited. Does not implicitly {@link legal.api.ChatRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.ChatRequest
             * @static
             * @param {legal.api.IChatRequest} message ChatRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ChatRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ChatRequest message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.ChatRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.ChatRequest} ChatRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ChatRequest.decode = undefined;
            };

            /**
             * Decodes a ChatRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.ChatRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.ChatRequest} ChatRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ChatRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ChatRequest message.
             * @function verify
             * @memberof legal.api.ChatRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ChatRequest.verify = undefined;
            };

            /**
             * Creates a ChatRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.ChatRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.ChatRequest} ChatRequest
             */
            ChatRequest.fromObject = undefined;
            };

            /**
             * Creates a plain object from a ChatRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.ChatRequest
             * @static
             * @param {legal.api.ChatRequest} message ChatRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ChatRequest.toObject = undefined;
            };

            /**
             * Converts this ChatRequest to JSON.
             * @function toJSON
             * @memberof legal.api.ChatRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ChatRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ChatRequest
             * @function getTypeUrl
             * @memberof legal.api.ChatRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ChatRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.ChatRequest";
            };

            return ChatRequest;
        })();

        api.ChatContext = (function() {

            /**
             * Properties of a ChatContext.
             * @memberof legal.api
             * @interface IChatContext
             * @property {Array.<string>|null} [documentIds] ChatContext documentIds
             * @property {string|null} [caseId] ChatContext caseId
             * @property {Array.<string>|null} [previousMessageIds] ChatContext previousMessageIds
             * @property {Object.<string,string>|null} [variables] ChatContext variables
             */

            /**
             * Constructs a new ChatContext.
             * @memberof legal.api
             * @classdesc Represents a ChatContext.
             * @implements IChatContext
             * @constructor
             * @param {legal.api.IChatContext=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * ChatContext documentIds.
             * @member {Array.<string>} documentIds
             * @memberof legal.api.ChatContext
             * @instance
             */
            ChatContext.prototype.documentIds = $util.emptyArray;

            /**
             * ChatContext caseId.
             * @member {string} caseId
             * @memberof legal.api.ChatContext
             * @instance
             */
            ChatContext.prototype.caseId = "";

            /**
             * ChatContext previousMessageIds.
             * @member {Array.<string>} previousMessageIds
             * @memberof legal.api.ChatContext
             * @instance
             */
            ChatContext.prototype.previousMessageIds = $util.emptyArray;

            /**
             * ChatContext variables.
             * @member {Object.<string,string>} variables
             * @memberof legal.api.ChatContext
             * @instance
             */
            ChatContext.prototype.variables = $util.emptyObject;

            /**
             * Creates a new ChatContext instance using the specified properties.
             * @function create
             * @memberof legal.api.ChatContext
             * @static
             * @param {legal.api.IChatContext=} [properties] Properties to set
             * @returns {legal.api.ChatContext} ChatContext instance
             */
            ChatContext.create = function create(properties) {
                return new ChatContext(properties);
            };

            /**
             * Encodes the specified ChatContext message. Does not implicitly {@link legal.api.ChatContext.verify|verify} messages.
             * @function encode
             * @memberof legal.api.ChatContext
             * @static
             * @param {legal.api.IChatContext} message ChatContext message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ChatContext.encode = undefined;
            };

            /**
             * Encodes the specified ChatContext message, length delimited. Does not implicitly {@link legal.api.ChatContext.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.ChatContext
             * @static
             * @param {legal.api.IChatContext} message ChatContext message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ChatContext.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ChatContext message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.ChatContext
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.ChatContext} ChatContext
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ChatContext.decode = undefined;
            };

            /**
             * Decodes a ChatContext message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.ChatContext
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.ChatContext} ChatContext
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ChatContext.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ChatContext message.
             * @function verify
             * @memberof legal.api.ChatContext
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ChatContext.verify = undefined;
            };

            /**
             * Creates a ChatContext message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.ChatContext
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.ChatContext} ChatContext
             */
            ChatContext.fromObject = undefined;
            };

            /**
             * Creates a plain object from a ChatContext message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.ChatContext
             * @static
             * @param {legal.api.ChatContext} message ChatContext
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ChatContext.toObject = undefined;
            };

            /**
             * Converts this ChatContext to JSON.
             * @function toJSON
             * @memberof legal.api.ChatContext
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ChatContext.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ChatContext
             * @function getTypeUrl
             * @memberof legal.api.ChatContext
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ChatContext.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.ChatContext";
            };

            return ChatContext;
        })();

        api.ChatOptions = (function() {

            /**
             * Properties of a ChatOptions.
             * @memberof legal.api
             * @interface IChatOptions
             * @property {string|null} [model] ChatOptions model
             * @property {number|null} [temperature] ChatOptions temperature
             * @property {number|null} [maxTokens] ChatOptions maxTokens
             * @property {boolean|null} [stream] ChatOptions stream
             * @property {boolean|null} [includeSources] ChatOptions includeSources
             */

            /**
             * Constructs a new ChatOptions.
             * @memberof legal.api
             * @classdesc Represents a ChatOptions.
             * @implements IChatOptions
             * @constructor
             * @param {legal.api.IChatOptions=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * ChatOptions model.
             * @member {string} model
             * @memberof legal.api.ChatOptions
             * @instance
             */
            ChatOptions.prototype.model = "";

            /**
             * ChatOptions temperature.
             * @member {number} temperature
             * @memberof legal.api.ChatOptions
             * @instance
             */
            ChatOptions.prototype.temperature = 0;

            /**
             * ChatOptions maxTokens.
             * @member {number} maxTokens
             * @memberof legal.api.ChatOptions
             * @instance
             */
            ChatOptions.prototype.maxTokens = 0;

            /**
             * ChatOptions stream.
             * @member {boolean} stream
             * @memberof legal.api.ChatOptions
             * @instance
             */
            ChatOptions.prototype.stream = $state(false);

            /**
             * ChatOptions includeSources.
             * @member {boolean} includeSources
             * @memberof legal.api.ChatOptions
             * @instance
             */
            ChatOptions.prototype.includeSources = $state(false);

            /**
             * Creates a new ChatOptions instance using the specified properties.
             * @function create
             * @memberof legal.api.ChatOptions
             * @static
             * @param {legal.api.IChatOptions=} [properties] Properties to set
             * @returns {legal.api.ChatOptions} ChatOptions instance
             */
            ChatOptions.create = function create(properties) {
                return new ChatOptions(properties);
            };

            /**
             * Encodes the specified ChatOptions message. Does not implicitly {@link legal.api.ChatOptions.verify|verify} messages.
             * @function encode
             * @memberof legal.api.ChatOptions
             * @static
             * @param {legal.api.IChatOptions} message ChatOptions message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ChatOptions.encode = undefined;
            };

            /**
             * Encodes the specified ChatOptions message, length delimited. Does not implicitly {@link legal.api.ChatOptions.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.ChatOptions
             * @static
             * @param {legal.api.IChatOptions} message ChatOptions message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ChatOptions.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ChatOptions message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.ChatOptions
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.ChatOptions} ChatOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ChatOptions.decode = undefined;
            };

            /**
             * Decodes a ChatOptions message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.ChatOptions
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.ChatOptions} ChatOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ChatOptions.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ChatOptions message.
             * @function verify
             * @memberof legal.api.ChatOptions
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ChatOptions.verify = undefined;
            };

            /**
             * Creates a ChatOptions message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.ChatOptions
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.ChatOptions} ChatOptions
             */
            ChatOptions.fromObject = undefined;
            };

            /**
             * Creates a plain object from a ChatOptions message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.ChatOptions
             * @static
             * @param {legal.api.ChatOptions} message ChatOptions
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ChatOptions.toObject = undefined;
            };

            /**
             * Converts this ChatOptions to JSON.
             * @function toJSON
             * @memberof legal.api.ChatOptions
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ChatOptions.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ChatOptions
             * @function getTypeUrl
             * @memberof legal.api.ChatOptions
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ChatOptions.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.ChatOptions";
            };

            return ChatOptions;
        })();

        api.ChatResponse = (function() {

            /**
             * Properties of a ChatResponse.
             * @memberof legal.api
             * @interface IChatResponse
             * @property {string|null} [response] ChatResponse response
             * @property {Array.<string>|null} [sources] ChatResponse sources
             * @property {number|null} [confidence] ChatResponse confidence
             * @property {string|null} [modelUsed] ChatResponse modelUsed
             * @property {number|null} [tokensUsed] ChatResponse tokensUsed
             * @property {Array.<legal.api.ILegalCitation>|null} [citations] ChatResponse citations
             * @property {Array.<legal.api.IActionItem>|null} [actionItems] ChatResponse actionItems
             */

            /**
             * Constructs a new ChatResponse.
             * @memberof legal.api
             * @classdesc Represents a ChatResponse.
             * @implements IChatResponse
             * @constructor
             * @param {legal.api.IChatResponse=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * ChatResponse response.
             * @member {string} response
             * @memberof legal.api.ChatResponse
             * @instance
             */
            ChatResponse.prototype.response = "";

            /**
             * ChatResponse sources.
             * @member {Array.<string>} sources
             * @memberof legal.api.ChatResponse
             * @instance
             */
            ChatResponse.prototype.sources = $util.emptyArray;

            /**
             * ChatResponse confidence.
             * @member {number} confidence
             * @memberof legal.api.ChatResponse
             * @instance
             */
            ChatResponse.prototype.confidence = 0;

            /**
             * ChatResponse modelUsed.
             * @member {string} modelUsed
             * @memberof legal.api.ChatResponse
             * @instance
             */
            ChatResponse.prototype.modelUsed = "";

            /**
             * ChatResponse tokensUsed.
             * @member {number} tokensUsed
             * @memberof legal.api.ChatResponse
             * @instance
             */
            ChatResponse.prototype.tokensUsed = 0;

            /**
             * ChatResponse citations.
             * @member {Array.<legal.api.ILegalCitation>} citations
             * @memberof legal.api.ChatResponse
             * @instance
             */
            ChatResponse.prototype.citations = $util.emptyArray;

            /**
             * ChatResponse actionItems.
             * @member {Array.<legal.api.IActionItem>} actionItems
             * @memberof legal.api.ChatResponse
             * @instance
             */
            ChatResponse.prototype.actionItems = $util.emptyArray;

            /**
             * Creates a new ChatResponse instance using the specified properties.
             * @function create
             * @memberof legal.api.ChatResponse
             * @static
             * @param {legal.api.IChatResponse=} [properties] Properties to set
             * @returns {legal.api.ChatResponse} ChatResponse instance
             */
            ChatResponse.create = function create(properties) {
                return new ChatResponse(properties);
            };

            /**
             * Encodes the specified ChatResponse message. Does not implicitly {@link legal.api.ChatResponse.verify|verify} messages.
             * @function encode
             * @memberof legal.api.ChatResponse
             * @static
             * @param {legal.api.IChatResponse} message ChatResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ChatResponse.encode = undefined;
            };

            /**
             * Encodes the specified ChatResponse message, length delimited. Does not implicitly {@link legal.api.ChatResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.ChatResponse
             * @static
             * @param {legal.api.IChatResponse} message ChatResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ChatResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ChatResponse message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.ChatResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.ChatResponse} ChatResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ChatResponse.decode = undefined;
            };

            /**
             * Decodes a ChatResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.ChatResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.ChatResponse} ChatResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ChatResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ChatResponse message.
             * @function verify
             * @memberof legal.api.ChatResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ChatResponse.verify = undefined;
            };

            /**
             * Creates a ChatResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.ChatResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.ChatResponse} ChatResponse
             */
            ChatResponse.fromObject = undefined;
            };

            /**
             * Creates a plain object from a ChatResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.ChatResponse
             * @static
             * @param {legal.api.ChatResponse} message ChatResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ChatResponse.toObject = undefined;
            };

            /**
             * Converts this ChatResponse to JSON.
             * @function toJSON
             * @memberof legal.api.ChatResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ChatResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ChatResponse
             * @function getTypeUrl
             * @memberof legal.api.ChatResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ChatResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.ChatResponse";
            };

            return ChatResponse;
        })();

        api.ActionItem = (function() {

            /**
             * Properties of an ActionItem.
             * @memberof legal.api
             * @interface IActionItem
             * @property {string|null} [description] ActionItem description
             * @property {legal.api.ActionPriority|null} [priority] ActionItem priority
             * @property {google.protobuf.ITimestamp|null} [dueDate] ActionItem dueDate
             * @property {string|null} [assignedTo] ActionItem assignedTo
             */

            /**
             * Constructs a new ActionItem.
             * @memberof legal.api
             * @classdesc Represents an ActionItem.
             * @implements IActionItem
             * @constructor
             * @param {legal.api.IActionItem=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * ActionItem description.
             * @member {string} description
             * @memberof legal.api.ActionItem
             * @instance
             */
            ActionItem.prototype.description = "";

            /**
             * ActionItem priority.
             * @member {legal.api.ActionPriority} priority
             * @memberof legal.api.ActionItem
             * @instance
             */
            ActionItem.prototype.priority = 0;

            /**
             * ActionItem dueDate.
             * @member {google.protobuf.ITimestamp|null|undefined} dueDate
             * @memberof legal.api.ActionItem
             * @instance
             */
            ActionItem.prototype.dueDate = null;

            /**
             * ActionItem assignedTo.
             * @member {string} assignedTo
             * @memberof legal.api.ActionItem
             * @instance
             */
            ActionItem.prototype.assignedTo = "";

            /**
             * Creates a new ActionItem instance using the specified properties.
             * @function create
             * @memberof legal.api.ActionItem
             * @static
             * @param {legal.api.IActionItem=} [properties] Properties to set
             * @returns {legal.api.ActionItem} ActionItem instance
             */
            ActionItem.create = function create(properties) {
                return new ActionItem(properties);
            };

            /**
             * Encodes the specified ActionItem message. Does not implicitly {@link legal.api.ActionItem.verify|verify} messages.
             * @function encode
             * @memberof legal.api.ActionItem
             * @static
             * @param {legal.api.IActionItem} message ActionItem message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ActionItem.encode = undefined;
            };

            /**
             * Encodes the specified ActionItem message, length delimited. Does not implicitly {@link legal.api.ActionItem.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.ActionItem
             * @static
             * @param {legal.api.IActionItem} message ActionItem message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ActionItem.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an ActionItem message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.ActionItem
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.ActionItem} ActionItem
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ActionItem.decode = undefined;
            };

            /**
             * Decodes an ActionItem message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.ActionItem
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.ActionItem} ActionItem
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ActionItem.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an ActionItem message.
             * @function verify
             * @memberof legal.api.ActionItem
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ActionItem.verify = undefined;
            };

            /**
             * Creates an ActionItem message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.ActionItem
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.ActionItem} ActionItem
             */
            ActionItem.fromObject = undefined;
            };

            /**
             * Creates a plain object from an ActionItem message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.ActionItem
             * @static
             * @param {legal.api.ActionItem} message ActionItem
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ActionItem.toObject = undefined;
            };

            /**
             * Converts this ActionItem to JSON.
             * @function toJSON
             * @memberof legal.api.ActionItem
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ActionItem.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ActionItem
             * @function getTypeUrl
             * @memberof legal.api.ActionItem
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ActionItem.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.ActionItem";
            };

            return ActionItem;
        })();

        /**
         * ActionPriority enum.
         * @name legal.api.ActionPriority
         * @enum {number}
         * @property {number} ACTION_PRIORITY_LOW=0 ACTION_PRIORITY_LOW value
         * @property {number} ACTION_PRIORITY_MEDIUM=1 ACTION_PRIORITY_MEDIUM value
         * @property {number} ACTION_PRIORITY_HIGH=2 ACTION_PRIORITY_HIGH value
         * @property {number} ACTION_PRIORITY_CRITICAL=3 ACTION_PRIORITY_CRITICAL value
         */
        api.ActionPriority = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "ACTION_PRIORITY_LOW"] = 0;
            values[valuesById[1] = "ACTION_PRIORITY_MEDIUM"] = 1;
            values[valuesById[2] = "ACTION_PRIORITY_HIGH"] = 2;
            values[valuesById[3] = "ACTION_PRIORITY_CRITICAL"] = 3;
            return values;
        })();

        api.Attachment = (function() {

            /**
             * Properties of an Attachment.
             * @memberof legal.api
             * @interface IAttachment
             * @property {string|null} [filename] Attachment filename
             * @property {string|null} [contentType] Attachment contentType
             * @property {number|Long|null} [size] Attachment size
             * @property {string|null} [url] Attachment url
             * @property {string|null} [checksum] Attachment checksum
             */

            /**
             * Constructs a new Attachment.
             * @memberof legal.api
             * @classdesc Represents an Attachment.
             * @implements IAttachment
             * @constructor
             * @param {legal.api.IAttachment=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * Attachment filename.
             * @member {string} filename
             * @memberof legal.api.Attachment
             * @instance
             */
            Attachment.prototype.filename = "";

            /**
             * Attachment contentType.
             * @member {string} contentType
             * @memberof legal.api.Attachment
             * @instance
             */
            Attachment.prototype.contentType = "";

            /**
             * Attachment size.
             * @member {number|Long} size
             * @memberof legal.api.Attachment
             * @instance
             */
            Attachment.prototype.size = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Attachment url.
             * @member {string} url
             * @memberof legal.api.Attachment
             * @instance
             */
            Attachment.prototype.url = "";

            /**
             * Attachment checksum.
             * @member {string} checksum
             * @memberof legal.api.Attachment
             * @instance
             */
            Attachment.prototype.checksum = "";

            /**
             * Creates a new Attachment instance using the specified properties.
             * @function create
             * @memberof legal.api.Attachment
             * @static
             * @param {legal.api.IAttachment=} [properties] Properties to set
             * @returns {legal.api.Attachment} Attachment instance
             */
            Attachment.create = function create(properties) {
                return new Attachment(properties);
            };

            /**
             * Encodes the specified Attachment message. Does not implicitly {@link legal.api.Attachment.verify|verify} messages.
             * @function encode
             * @memberof legal.api.Attachment
             * @static
             * @param {legal.api.IAttachment} message Attachment message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Attachment.encode = undefined;
            };

            /**
             * Encodes the specified Attachment message, length delimited. Does not implicitly {@link legal.api.Attachment.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.Attachment
             * @static
             * @param {legal.api.IAttachment} message Attachment message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Attachment.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an Attachment message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.Attachment
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.Attachment} Attachment
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Attachment.decode = undefined;
            };

            /**
             * Decodes an Attachment message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.Attachment
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.Attachment} Attachment
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Attachment.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an Attachment message.
             * @function verify
             * @memberof legal.api.Attachment
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Attachment.verify = undefined;
            };

            /**
             * Creates an Attachment message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.Attachment
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.Attachment} Attachment
             */
            Attachment.fromObject = undefined;
            };

            /**
             * Creates a plain object from an Attachment message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.Attachment
             * @static
             * @param {legal.api.Attachment} message Attachment
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Attachment.toObject = undefined;
            };

            /**
             * Converts this Attachment to JSON.
             * @function toJSON
             * @memberof legal.api.Attachment
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Attachment.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Attachment
             * @function getTypeUrl
             * @memberof legal.api.Attachment
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Attachment.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.Attachment";
            };

            return Attachment;
        })();

        api.AnalysisRequest = (function() {

            /**
             * Properties of an AnalysisRequest.
             * @memberof legal.api
             * @interface IAnalysisRequest
             * @property {string|null} [documentId] AnalysisRequest documentId
             * @property {legal.api.AnalysisType|null} [type] AnalysisRequest type
             * @property {Array.<string>|null} [specificQueries] AnalysisRequest specificQueries
             * @property {legal.api.IAnalysisOptions|null} [options] AnalysisRequest options
             * @property {string|null} [userId] AnalysisRequest userId
             */

            /**
             * Constructs a new AnalysisRequest.
             * @memberof legal.api
             * @classdesc Represents an AnalysisRequest.
             * @implements IAnalysisRequest
             * @constructor
             * @param {legal.api.IAnalysisRequest=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * AnalysisRequest documentId.
             * @member {string} documentId
             * @memberof legal.api.AnalysisRequest
             * @instance
             */
            AnalysisRequest.prototype.documentId = "";

            /**
             * AnalysisRequest type.
             * @member {legal.api.AnalysisType} type
             * @memberof legal.api.AnalysisRequest
             * @instance
             */
            AnalysisRequest.prototype.type = 0;

            /**
             * AnalysisRequest specificQueries.
             * @member {Array.<string>} specificQueries
             * @memberof legal.api.AnalysisRequest
             * @instance
             */
            AnalysisRequest.prototype.specificQueries = $util.emptyArray;

            /**
             * AnalysisRequest options.
             * @member {legal.api.IAnalysisOptions|null|undefined} options
             * @memberof legal.api.AnalysisRequest
             * @instance
             */
            AnalysisRequest.prototype.options = null;

            /**
             * AnalysisRequest userId.
             * @member {string} userId
             * @memberof legal.api.AnalysisRequest
             * @instance
             */
            AnalysisRequest.prototype.userId = "";

            /**
             * Creates a new AnalysisRequest instance using the specified properties.
             * @function create
             * @memberof legal.api.AnalysisRequest
             * @static
             * @param {legal.api.IAnalysisRequest=} [properties] Properties to set
             * @returns {legal.api.AnalysisRequest} AnalysisRequest instance
             */
            AnalysisRequest.create = function create(properties) {
                return new AnalysisRequest(properties);
            };

            /**
             * Encodes the specified AnalysisRequest message. Does not implicitly {@link legal.api.AnalysisRequest.verify|verify} messages.
             * @function encode
             * @memberof legal.api.AnalysisRequest
             * @static
             * @param {legal.api.IAnalysisRequest} message AnalysisRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AnalysisRequest.encode = undefined;
            };

            /**
             * Encodes the specified AnalysisRequest message, length delimited. Does not implicitly {@link legal.api.AnalysisRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.AnalysisRequest
             * @static
             * @param {legal.api.IAnalysisRequest} message AnalysisRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AnalysisRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an AnalysisRequest message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.AnalysisRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.AnalysisRequest} AnalysisRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AnalysisRequest.decode = undefined;
            };

            /**
             * Decodes an AnalysisRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.AnalysisRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.AnalysisRequest} AnalysisRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AnalysisRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an AnalysisRequest message.
             * @function verify
             * @memberof legal.api.AnalysisRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            AnalysisRequest.verify = undefined;
            };

            /**
             * Creates an AnalysisRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.AnalysisRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.AnalysisRequest} AnalysisRequest
             */
            AnalysisRequest.fromObject = undefined;
            };

            /**
             * Creates a plain object from an AnalysisRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.AnalysisRequest
             * @static
             * @param {legal.api.AnalysisRequest} message AnalysisRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            AnalysisRequest.toObject = undefined;
            };

            /**
             * Converts this AnalysisRequest to JSON.
             * @function toJSON
             * @memberof legal.api.AnalysisRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            AnalysisRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for AnalysisRequest
             * @function getTypeUrl
             * @memberof legal.api.AnalysisRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            AnalysisRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.AnalysisRequest";
            };

            return AnalysisRequest;
        })();

        /**
         * AnalysisType enum.
         * @name legal.api.AnalysisType
         * @enum {number}
         * @property {number} ANALYSIS_TYPE_RISK_ASSESSMENT=0 ANALYSIS_TYPE_RISK_ASSESSMENT value
         * @property {number} ANALYSIS_TYPE_CLAUSE_EXTRACTION=1 ANALYSIS_TYPE_CLAUSE_EXTRACTION value
         * @property {number} ANALYSIS_TYPE_COMPLIANCE_CHECK=2 ANALYSIS_TYPE_COMPLIANCE_CHECK value
         * @property {number} ANALYSIS_TYPE_PRECEDENT_ANALYSIS=3 ANALYSIS_TYPE_PRECEDENT_ANALYSIS value
         * @property {number} ANALYSIS_TYPE_ENTITY_EXTRACTION=4 ANALYSIS_TYPE_ENTITY_EXTRACTION value
         * @property {number} ANALYSIS_TYPE_SENTIMENT_ANALYSIS=5 ANALYSIS_TYPE_SENTIMENT_ANALYSIS value
         */
        api.AnalysisType = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "ANALYSIS_TYPE_RISK_ASSESSMENT"] = 0;
            values[valuesById[1] = "ANALYSIS_TYPE_CLAUSE_EXTRACTION"] = 1;
            values[valuesById[2] = "ANALYSIS_TYPE_COMPLIANCE_CHECK"] = 2;
            values[valuesById[3] = "ANALYSIS_TYPE_PRECEDENT_ANALYSIS"] = 3;
            values[valuesById[4] = "ANALYSIS_TYPE_ENTITY_EXTRACTION"] = 4;
            values[valuesById[5] = "ANALYSIS_TYPE_SENTIMENT_ANALYSIS"] = 5;
            return values;
        })();

        api.AnalysisOptions = (function() {

            /**
             * Properties of an AnalysisOptions.
             * @memberof legal.api
             * @interface IAnalysisOptions
             * @property {string|null} [jurisdiction] AnalysisOptions jurisdiction
             * @property {Array.<string>|null} [practiceAreas] AnalysisOptions practiceAreas
             * @property {number|null} [confidenceThreshold] AnalysisOptions confidenceThreshold
             * @property {boolean|null} [includeRecommendations] AnalysisOptions includeRecommendations
             */

            /**
             * Constructs a new AnalysisOptions.
             * @memberof legal.api
             * @classdesc Represents an AnalysisOptions.
             * @implements IAnalysisOptions
             * @constructor
             * @param {legal.api.IAnalysisOptions=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * AnalysisOptions jurisdiction.
             * @member {string} jurisdiction
             * @memberof legal.api.AnalysisOptions
             * @instance
             */
            AnalysisOptions.prototype.jurisdiction = "";

            /**
             * AnalysisOptions practiceAreas.
             * @member {Array.<string>} practiceAreas
             * @memberof legal.api.AnalysisOptions
             * @instance
             */
            AnalysisOptions.prototype.practiceAreas = $util.emptyArray;

            /**
             * AnalysisOptions confidenceThreshold.
             * @member {number} confidenceThreshold
             * @memberof legal.api.AnalysisOptions
             * @instance
             */
            AnalysisOptions.prototype.confidenceThreshold = 0;

            /**
             * AnalysisOptions includeRecommendations.
             * @member {boolean} includeRecommendations
             * @memberof legal.api.AnalysisOptions
             * @instance
             */
            AnalysisOptions.prototype.includeRecommendations = $state(false);

            /**
             * Creates a new AnalysisOptions instance using the specified properties.
             * @function create
             * @memberof legal.api.AnalysisOptions
             * @static
             * @param {legal.api.IAnalysisOptions=} [properties] Properties to set
             * @returns {legal.api.AnalysisOptions} AnalysisOptions instance
             */
            AnalysisOptions.create = function create(properties) {
                return new AnalysisOptions(properties);
            };

            /**
             * Encodes the specified AnalysisOptions message. Does not implicitly {@link legal.api.AnalysisOptions.verify|verify} messages.
             * @function encode
             * @memberof legal.api.AnalysisOptions
             * @static
             * @param {legal.api.IAnalysisOptions} message AnalysisOptions message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AnalysisOptions.encode = undefined;
            };

            /**
             * Encodes the specified AnalysisOptions message, length delimited. Does not implicitly {@link legal.api.AnalysisOptions.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.AnalysisOptions
             * @static
             * @param {legal.api.IAnalysisOptions} message AnalysisOptions message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AnalysisOptions.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an AnalysisOptions message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.AnalysisOptions
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.AnalysisOptions} AnalysisOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AnalysisOptions.decode = undefined;
            };

            /**
             * Decodes an AnalysisOptions message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.AnalysisOptions
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.AnalysisOptions} AnalysisOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AnalysisOptions.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an AnalysisOptions message.
             * @function verify
             * @memberof legal.api.AnalysisOptions
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            AnalysisOptions.verify = undefined;
            };

            /**
             * Creates an AnalysisOptions message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.AnalysisOptions
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.AnalysisOptions} AnalysisOptions
             */
            AnalysisOptions.fromObject = undefined;
            };

            /**
             * Creates a plain object from an AnalysisOptions message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.AnalysisOptions
             * @static
             * @param {legal.api.AnalysisOptions} message AnalysisOptions
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            AnalysisOptions.toObject = undefined;
            };

            /**
             * Converts this AnalysisOptions to JSON.
             * @function toJSON
             * @memberof legal.api.AnalysisOptions
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            AnalysisOptions.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for AnalysisOptions
             * @function getTypeUrl
             * @memberof legal.api.AnalysisOptions
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            AnalysisOptions.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.AnalysisOptions";
            };

            return AnalysisOptions;
        })();

        api.AnalysisResponse = (function() {

            /**
             * Properties of an AnalysisResponse.
             * @memberof legal.api
             * @interface IAnalysisResponse
             * @property {string|null} [analysisId] AnalysisResponse analysisId
             * @property {legal.api.AnalysisType|null} [type] AnalysisResponse type
             * @property {Array.<legal.api.IAnalysisResult>|null} [results] AnalysisResponse results
             * @property {number|null} [overallConfidence] AnalysisResponse overallConfidence
             * @property {google.protobuf.ITimestamp|null} [createdAt] AnalysisResponse createdAt
             * @property {Array.<legal.api.IRecommendation>|null} [recommendations] AnalysisResponse recommendations
             */

            /**
             * Constructs a new AnalysisResponse.
             * @memberof legal.api
             * @classdesc Represents an AnalysisResponse.
             * @implements IAnalysisResponse
             * @constructor
             * @param {legal.api.IAnalysisResponse=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * AnalysisResponse analysisId.
             * @member {string} analysisId
             * @memberof legal.api.AnalysisResponse
             * @instance
             */
            AnalysisResponse.prototype.analysisId = "";

            /**
             * AnalysisResponse type.
             * @member {legal.api.AnalysisType} type
             * @memberof legal.api.AnalysisResponse
             * @instance
             */
            AnalysisResponse.prototype.type = 0;

            /**
             * AnalysisResponse results.
             * @member {Array.<legal.api.IAnalysisResult>} results
             * @memberof legal.api.AnalysisResponse
             * @instance
             */
            AnalysisResponse.prototype.results = $util.emptyArray;

            /**
             * AnalysisResponse overallConfidence.
             * @member {number} overallConfidence
             * @memberof legal.api.AnalysisResponse
             * @instance
             */
            AnalysisResponse.prototype.overallConfidence = 0;

            /**
             * AnalysisResponse createdAt.
             * @member {google.protobuf.ITimestamp|null|undefined} createdAt
             * @memberof legal.api.AnalysisResponse
             * @instance
             */
            AnalysisResponse.prototype.createdAt = null;

            /**
             * AnalysisResponse recommendations.
             * @member {Array.<legal.api.IRecommendation>} recommendations
             * @memberof legal.api.AnalysisResponse
             * @instance
             */
            AnalysisResponse.prototype.recommendations = $util.emptyArray;

            /**
             * Creates a new AnalysisResponse instance using the specified properties.
             * @function create
             * @memberof legal.api.AnalysisResponse
             * @static
             * @param {legal.api.IAnalysisResponse=} [properties] Properties to set
             * @returns {legal.api.AnalysisResponse} AnalysisResponse instance
             */
            AnalysisResponse.create = function create(properties) {
                return new AnalysisResponse(properties);
            };

            /**
             * Encodes the specified AnalysisResponse message. Does not implicitly {@link legal.api.AnalysisResponse.verify|verify} messages.
             * @function encode
             * @memberof legal.api.AnalysisResponse
             * @static
             * @param {legal.api.IAnalysisResponse} message AnalysisResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AnalysisResponse.encode = undefined;
            };

            /**
             * Encodes the specified AnalysisResponse message, length delimited. Does not implicitly {@link legal.api.AnalysisResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.AnalysisResponse
             * @static
             * @param {legal.api.IAnalysisResponse} message AnalysisResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AnalysisResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an AnalysisResponse message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.AnalysisResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.AnalysisResponse} AnalysisResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AnalysisResponse.decode = undefined;
            };

            /**
             * Decodes an AnalysisResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.AnalysisResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.AnalysisResponse} AnalysisResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AnalysisResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an AnalysisResponse message.
             * @function verify
             * @memberof legal.api.AnalysisResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            AnalysisResponse.verify = undefined;
            };

            /**
             * Creates an AnalysisResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.AnalysisResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.AnalysisResponse} AnalysisResponse
             */
            AnalysisResponse.fromObject = undefined;
            };

            /**
             * Creates a plain object from an AnalysisResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.AnalysisResponse
             * @static
             * @param {legal.api.AnalysisResponse} message AnalysisResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            AnalysisResponse.toObject = undefined;
            };

            /**
             * Converts this AnalysisResponse to JSON.
             * @function toJSON
             * @memberof legal.api.AnalysisResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            AnalysisResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for AnalysisResponse
             * @function getTypeUrl
             * @memberof legal.api.AnalysisResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            AnalysisResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.AnalysisResponse";
            };

            return AnalysisResponse;
        })();

        api.AnalysisResult = (function() {

            /**
             * Properties of an AnalysisResult.
             * @memberof legal.api
             * @interface IAnalysisResult
             * @property {string|null} [category] AnalysisResult category
             * @property {string|null} [finding] AnalysisResult finding
             * @property {number|null} [confidence] AnalysisResult confidence
             * @property {Array.<string>|null} [supportingText] AnalysisResult supportingText
             * @property {Array.<legal.api.ILegalCitation>|null} [citations] AnalysisResult citations
             * @property {legal.api.RiskLevel|null} [riskLevel] AnalysisResult riskLevel
             */

            /**
             * Constructs a new AnalysisResult.
             * @memberof legal.api
             * @classdesc Represents an AnalysisResult.
             * @implements IAnalysisResult
             * @constructor
             * @param {legal.api.IAnalysisResult=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * AnalysisResult category.
             * @member {string} category
             * @memberof legal.api.AnalysisResult
             * @instance
             */
            AnalysisResult.prototype.category = "";

            /**
             * AnalysisResult finding.
             * @member {string} finding
             * @memberof legal.api.AnalysisResult
             * @instance
             */
            AnalysisResult.prototype.finding = "";

            /**
             * AnalysisResult confidence.
             * @member {number} confidence
             * @memberof legal.api.AnalysisResult
             * @instance
             */
            AnalysisResult.prototype.confidence = 0;

            /**
             * AnalysisResult supportingText.
             * @member {Array.<string>} supportingText
             * @memberof legal.api.AnalysisResult
             * @instance
             */
            AnalysisResult.prototype.supportingText = $util.emptyArray;

            /**
             * AnalysisResult citations.
             * @member {Array.<legal.api.ILegalCitation>} citations
             * @memberof legal.api.AnalysisResult
             * @instance
             */
            AnalysisResult.prototype.citations = $util.emptyArray;

            /**
             * AnalysisResult riskLevel.
             * @member {legal.api.RiskLevel} riskLevel
             * @memberof legal.api.AnalysisResult
             * @instance
             */
            AnalysisResult.prototype.riskLevel = 0;

            /**
             * Creates a new AnalysisResult instance using the specified properties.
             * @function create
             * @memberof legal.api.AnalysisResult
             * @static
             * @param {legal.api.IAnalysisResult=} [properties] Properties to set
             * @returns {legal.api.AnalysisResult} AnalysisResult instance
             */
            AnalysisResult.create = function create(properties) {
                return new AnalysisResult(properties);
            };

            /**
             * Encodes the specified AnalysisResult message. Does not implicitly {@link legal.api.AnalysisResult.verify|verify} messages.
             * @function encode
             * @memberof legal.api.AnalysisResult
             * @static
             * @param {legal.api.IAnalysisResult} message AnalysisResult message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AnalysisResult.encode = undefined;
            };

            /**
             * Encodes the specified AnalysisResult message, length delimited. Does not implicitly {@link legal.api.AnalysisResult.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.AnalysisResult
             * @static
             * @param {legal.api.IAnalysisResult} message AnalysisResult message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AnalysisResult.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an AnalysisResult message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.AnalysisResult
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.AnalysisResult} AnalysisResult
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AnalysisResult.decode = undefined;
            };

            /**
             * Decodes an AnalysisResult message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.AnalysisResult
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.AnalysisResult} AnalysisResult
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AnalysisResult.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an AnalysisResult message.
             * @function verify
             * @memberof legal.api.AnalysisResult
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            AnalysisResult.verify = undefined;
            };

            /**
             * Creates an AnalysisResult message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.AnalysisResult
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.AnalysisResult} AnalysisResult
             */
            AnalysisResult.fromObject = undefined;
            };

            /**
             * Creates a plain object from an AnalysisResult message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.AnalysisResult
             * @static
             * @param {legal.api.AnalysisResult} message AnalysisResult
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            AnalysisResult.toObject = undefined;
            };

            /**
             * Converts this AnalysisResult to JSON.
             * @function toJSON
             * @memberof legal.api.AnalysisResult
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            AnalysisResult.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for AnalysisResult
             * @function getTypeUrl
             * @memberof legal.api.AnalysisResult
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            AnalysisResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.AnalysisResult";
            };

            return AnalysisResult;
        })();

        /**
         * RiskLevel enum.
         * @name legal.api.RiskLevel
         * @enum {number}
         * @property {number} RISK_LEVEL_LOW=0 RISK_LEVEL_LOW value
         * @property {number} RISK_LEVEL_MEDIUM=1 RISK_LEVEL_MEDIUM value
         * @property {number} RISK_LEVEL_HIGH=2 RISK_LEVEL_HIGH value
         * @property {number} RISK_LEVEL_CRITICAL=3 RISK_LEVEL_CRITICAL value
         */
        api.RiskLevel = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "RISK_LEVEL_LOW"] = 0;
            values[valuesById[1] = "RISK_LEVEL_MEDIUM"] = 1;
            values[valuesById[2] = "RISK_LEVEL_HIGH"] = 2;
            values[valuesById[3] = "RISK_LEVEL_CRITICAL"] = 3;
            return values;
        })();

        api.Recommendation = (function() {

            /**
             * Properties of a Recommendation.
             * @memberof legal.api
             * @interface IRecommendation
             * @property {string|null} [title] Recommendation title
             * @property {string|null} [description] Recommendation description
             * @property {legal.api.RecommendationType|null} [type] Recommendation type
             * @property {legal.api.ActionPriority|null} [priority] Recommendation priority
             * @property {Array.<string>|null} [steps] Recommendation steps
             */

            /**
             * Constructs a new Recommendation.
             * @memberof legal.api
             * @classdesc Represents a Recommendation.
             * @implements IRecommendation
             * @constructor
             * @param {legal.api.IRecommendation=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * Recommendation title.
             * @member {string} title
             * @memberof legal.api.Recommendation
             * @instance
             */
            Recommendation.prototype.title = "";

            /**
             * Recommendation description.
             * @member {string} description
             * @memberof legal.api.Recommendation
             * @instance
             */
            Recommendation.prototype.description = "";

            /**
             * Recommendation type.
             * @member {legal.api.RecommendationType} type
             * @memberof legal.api.Recommendation
             * @instance
             */
            Recommendation.prototype.type = 0;

            /**
             * Recommendation priority.
             * @member {legal.api.ActionPriority} priority
             * @memberof legal.api.Recommendation
             * @instance
             */
            Recommendation.prototype.priority = 0;

            /**
             * Recommendation steps.
             * @member {Array.<string>} steps
             * @memberof legal.api.Recommendation
             * @instance
             */
            Recommendation.prototype.steps = $util.emptyArray;

            /**
             * Creates a new Recommendation instance using the specified properties.
             * @function create
             * @memberof legal.api.Recommendation
             * @static
             * @param {legal.api.IRecommendation=} [properties] Properties to set
             * @returns {legal.api.Recommendation} Recommendation instance
             */
            Recommendation.create = function create(properties) {
                return new Recommendation(properties);
            };

            /**
             * Encodes the specified Recommendation message. Does not implicitly {@link legal.api.Recommendation.verify|verify} messages.
             * @function encode
             * @memberof legal.api.Recommendation
             * @static
             * @param {legal.api.IRecommendation} message Recommendation message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Recommendation.encode = undefined;
            };

            /**
             * Encodes the specified Recommendation message, length delimited. Does not implicitly {@link legal.api.Recommendation.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.Recommendation
             * @static
             * @param {legal.api.IRecommendation} message Recommendation message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Recommendation.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Recommendation message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.Recommendation
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.Recommendation} Recommendation
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Recommendation.decode = undefined;
            };

            /**
             * Decodes a Recommendation message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.Recommendation
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.Recommendation} Recommendation
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Recommendation.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Recommendation message.
             * @function verify
             * @memberof legal.api.Recommendation
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Recommendation.verify = undefined;
            };

            /**
             * Creates a Recommendation message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.Recommendation
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.Recommendation} Recommendation
             */
            Recommendation.fromObject = undefined;
            };

            /**
             * Creates a plain object from a Recommendation message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.Recommendation
             * @static
             * @param {legal.api.Recommendation} message Recommendation
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Recommendation.toObject = undefined;
            };

            /**
             * Converts this Recommendation to JSON.
             * @function toJSON
             * @memberof legal.api.Recommendation
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Recommendation.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Recommendation
             * @function getTypeUrl
             * @memberof legal.api.Recommendation
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Recommendation.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.Recommendation";
            };

            return Recommendation;
        })();

        /**
         * RecommendationType enum.
         * @name legal.api.RecommendationType
         * @enum {number}
         * @property {number} RECOMMENDATION_TYPE_ACTION=0 RECOMMENDATION_TYPE_ACTION value
         * @property {number} RECOMMENDATION_TYPE_RESEARCH=1 RECOMMENDATION_TYPE_RESEARCH value
         * @property {number} RECOMMENDATION_TYPE_REVIEW=2 RECOMMENDATION_TYPE_REVIEW value
         * @property {number} RECOMMENDATION_TYPE_COMPLIANCE=3 RECOMMENDATION_TYPE_COMPLIANCE value
         */
        api.RecommendationType = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "RECOMMENDATION_TYPE_ACTION"] = 0;
            values[valuesById[1] = "RECOMMENDATION_TYPE_RESEARCH"] = 1;
            values[valuesById[2] = "RECOMMENDATION_TYPE_REVIEW"] = 2;
            values[valuesById[3] = "RECOMMENDATION_TYPE_COMPLIANCE"] = 3;
            return values;
        })();

        api.HealthCheckRequest = (function() {

            /**
             * Properties of a HealthCheckRequest.
             * @memberof legal.api
             * @interface IHealthCheckRequest
             * @property {string|null} [service] HealthCheckRequest service
             * @property {boolean|null} [includeDetails] HealthCheckRequest includeDetails
             */

            /**
             * Constructs a new HealthCheckRequest.
             * @memberof legal.api
             * @classdesc Represents a HealthCheckRequest.
             * @implements IHealthCheckRequest
             * @constructor
             * @param {legal.api.IHealthCheckRequest=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * HealthCheckRequest service.
             * @member {string} service
             * @memberof legal.api.HealthCheckRequest
             * @instance
             */
            HealthCheckRequest.prototype.service = "";

            /**
             * HealthCheckRequest includeDetails.
             * @member {boolean} includeDetails
             * @memberof legal.api.HealthCheckRequest
             * @instance
             */
            HealthCheckRequest.prototype.includeDetails = $state(false);

            /**
             * Creates a new HealthCheckRequest instance using the specified properties.
             * @function create
             * @memberof legal.api.HealthCheckRequest
             * @static
             * @param {legal.api.IHealthCheckRequest=} [properties] Properties to set
             * @returns {legal.api.HealthCheckRequest} HealthCheckRequest instance
             */
            HealthCheckRequest.create = function create(properties) {
                return new HealthCheckRequest(properties);
            };

            /**
             * Encodes the specified HealthCheckRequest message. Does not implicitly {@link legal.api.HealthCheckRequest.verify|verify} messages.
             * @function encode
             * @memberof legal.api.HealthCheckRequest
             * @static
             * @param {legal.api.IHealthCheckRequest} message HealthCheckRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            HealthCheckRequest.encode = undefined;
            };

            /**
             * Encodes the specified HealthCheckRequest message, length delimited. Does not implicitly {@link legal.api.HealthCheckRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.HealthCheckRequest
             * @static
             * @param {legal.api.IHealthCheckRequest} message HealthCheckRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            HealthCheckRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a HealthCheckRequest message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.HealthCheckRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.HealthCheckRequest} HealthCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            HealthCheckRequest.decode = undefined;
            };

            /**
             * Decodes a HealthCheckRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.HealthCheckRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.HealthCheckRequest} HealthCheckRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            HealthCheckRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a HealthCheckRequest message.
             * @function verify
             * @memberof legal.api.HealthCheckRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            HealthCheckRequest.verify = undefined;
            };

            /**
             * Creates a HealthCheckRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.HealthCheckRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.HealthCheckRequest} HealthCheckRequest
             */
            HealthCheckRequest.fromObject = undefined;
            };

            /**
             * Creates a plain object from a HealthCheckRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.HealthCheckRequest
             * @static
             * @param {legal.api.HealthCheckRequest} message HealthCheckRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            HealthCheckRequest.toObject = undefined;
            };

            /**
             * Converts this HealthCheckRequest to JSON.
             * @function toJSON
             * @memberof legal.api.HealthCheckRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            HealthCheckRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for HealthCheckRequest
             * @function getTypeUrl
             * @memberof legal.api.HealthCheckRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            HealthCheckRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.HealthCheckRequest";
            };

            return HealthCheckRequest;
        })();

        api.HealthCheckResponse = (function() {

            /**
             * Properties of a HealthCheckResponse.
             * @memberof legal.api
             * @interface IHealthCheckResponse
             * @property {boolean|null} [healthy] HealthCheckResponse healthy
             * @property {string|null} [status] HealthCheckResponse status
             * @property {Object.<string,string>|null} [details] HealthCheckResponse details
             * @property {google.protobuf.ITimestamp|null} [timestamp] HealthCheckResponse timestamp
             * @property {string|null} [version] HealthCheckResponse version
             */

            /**
             * Constructs a new HealthCheckResponse.
             * @memberof legal.api
             * @classdesc Represents a HealthCheckResponse.
             * @implements IHealthCheckResponse
             * @constructor
             * @param {legal.api.IHealthCheckResponse=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * HealthCheckResponse healthy.
             * @member {boolean} healthy
             * @memberof legal.api.HealthCheckResponse
             * @instance
             */
            HealthCheckResponse.prototype.healthy = $state(false);

            /**
             * HealthCheckResponse status.
             * @member {string} status
             * @memberof legal.api.HealthCheckResponse
             * @instance
             */
            HealthCheckResponse.prototype.status = "";

            /**
             * HealthCheckResponse details.
             * @member {Object.<string,string>} details
             * @memberof legal.api.HealthCheckResponse
             * @instance
             */
            HealthCheckResponse.prototype.details = $util.emptyObject;

            /**
             * HealthCheckResponse timestamp.
             * @member {google.protobuf.ITimestamp|null|undefined} timestamp
             * @memberof legal.api.HealthCheckResponse
             * @instance
             */
            HealthCheckResponse.prototype.timestamp = null;

            /**
             * HealthCheckResponse version.
             * @member {string} version
             * @memberof legal.api.HealthCheckResponse
             * @instance
             */
            HealthCheckResponse.prototype.version = "";

            /**
             * Creates a new HealthCheckResponse instance using the specified properties.
             * @function create
             * @memberof legal.api.HealthCheckResponse
             * @static
             * @param {legal.api.IHealthCheckResponse=} [properties] Properties to set
             * @returns {legal.api.HealthCheckResponse} HealthCheckResponse instance
             */
            HealthCheckResponse.create = function create(properties) {
                return new HealthCheckResponse(properties);
            };

            /**
             * Encodes the specified HealthCheckResponse message. Does not implicitly {@link legal.api.HealthCheckResponse.verify|verify} messages.
             * @function encode
             * @memberof legal.api.HealthCheckResponse
             * @static
             * @param {legal.api.IHealthCheckResponse} message HealthCheckResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            HealthCheckResponse.encode = undefined;
            };

            /**
             * Encodes the specified HealthCheckResponse message, length delimited. Does not implicitly {@link legal.api.HealthCheckResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.HealthCheckResponse
             * @static
             * @param {legal.api.IHealthCheckResponse} message HealthCheckResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            HealthCheckResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a HealthCheckResponse message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.HealthCheckResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.HealthCheckResponse} HealthCheckResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            HealthCheckResponse.decode = undefined;
            };

            /**
             * Decodes a HealthCheckResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.HealthCheckResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.HealthCheckResponse} HealthCheckResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            HealthCheckResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a HealthCheckResponse message.
             * @function verify
             * @memberof legal.api.HealthCheckResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            HealthCheckResponse.verify = undefined;
            };

            /**
             * Creates a HealthCheckResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.HealthCheckResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.HealthCheckResponse} HealthCheckResponse
             */
            HealthCheckResponse.fromObject = undefined;
            };

            /**
             * Creates a plain object from a HealthCheckResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.HealthCheckResponse
             * @static
             * @param {legal.api.HealthCheckResponse} message HealthCheckResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            HealthCheckResponse.toObject = undefined;
            };

            /**
             * Converts this HealthCheckResponse to JSON.
             * @function toJSON
             * @memberof legal.api.HealthCheckResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            HealthCheckResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for HealthCheckResponse
             * @function getTypeUrl
             * @memberof legal.api.HealthCheckResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            HealthCheckResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.HealthCheckResponse";
            };

            return HealthCheckResponse;
        })();

        api.SystemStatus = (function() {

            /**
             * Properties of a SystemStatus.
             * @memberof legal.api
             * @interface ISystemStatus
             * @property {string|null} [serviceName] SystemStatus serviceName
             * @property {boolean|null} [operational] SystemStatus operational
             * @property {number|null} [cpuUsage] SystemStatus cpuUsage
             * @property {number|null} [memoryUsage] SystemStatus memoryUsage
             * @property {number|null} [activeConnections] SystemStatus activeConnections
             * @property {number|Long|null} [requestsPerMinute] SystemStatus requestsPerMinute
             * @property {google.protobuf.ITimestamp|null} [lastUpdated] SystemStatus lastUpdated
             */

            /**
             * Constructs a new SystemStatus.
             * @memberof legal.api
             * @classdesc Represents a SystemStatus.
             * @implements ISystemStatus
             * @constructor
             * @param {legal.api.ISystemStatus=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * SystemStatus serviceName.
             * @member {string} serviceName
             * @memberof legal.api.SystemStatus
             * @instance
             */
            SystemStatus.prototype.serviceName = "";

            /**
             * SystemStatus operational.
             * @member {boolean} operational
             * @memberof legal.api.SystemStatus
             * @instance
             */
            SystemStatus.prototype.operational = $state(false);

            /**
             * SystemStatus cpuUsage.
             * @member {number} cpuUsage
             * @memberof legal.api.SystemStatus
             * @instance
             */
            SystemStatus.prototype.cpuUsage = 0;

            /**
             * SystemStatus memoryUsage.
             * @member {number} memoryUsage
             * @memberof legal.api.SystemStatus
             * @instance
             */
            SystemStatus.prototype.memoryUsage = 0;

            /**
             * SystemStatus activeConnections.
             * @member {number} activeConnections
             * @memberof legal.api.SystemStatus
             * @instance
             */
            SystemStatus.prototype.activeConnections = 0;

            /**
             * SystemStatus requestsPerMinute.
             * @member {number|Long} requestsPerMinute
             * @memberof legal.api.SystemStatus
             * @instance
             */
            SystemStatus.prototype.requestsPerMinute = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * SystemStatus lastUpdated.
             * @member {google.protobuf.ITimestamp|null|undefined} lastUpdated
             * @memberof legal.api.SystemStatus
             * @instance
             */
            SystemStatus.prototype.lastUpdated = null;

            /**
             * Creates a new SystemStatus instance using the specified properties.
             * @function create
             * @memberof legal.api.SystemStatus
             * @static
             * @param {legal.api.ISystemStatus=} [properties] Properties to set
             * @returns {legal.api.SystemStatus} SystemStatus instance
             */
            SystemStatus.create = function create(properties) {
                return new SystemStatus(properties);
            };

            /**
             * Encodes the specified SystemStatus message. Does not implicitly {@link legal.api.SystemStatus.verify|verify} messages.
             * @function encode
             * @memberof legal.api.SystemStatus
             * @static
             * @param {legal.api.ISystemStatus} message SystemStatus message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SystemStatus.encode = undefined;
            };

            /**
             * Encodes the specified SystemStatus message, length delimited. Does not implicitly {@link legal.api.SystemStatus.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.SystemStatus
             * @static
             * @param {legal.api.ISystemStatus} message SystemStatus message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SystemStatus.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a SystemStatus message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.SystemStatus
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.SystemStatus} SystemStatus
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SystemStatus.decode = undefined;
            };

            /**
             * Decodes a SystemStatus message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.SystemStatus
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.SystemStatus} SystemStatus
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SystemStatus.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SystemStatus message.
             * @function verify
             * @memberof legal.api.SystemStatus
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SystemStatus.verify = undefined;
            };

            /**
             * Creates a SystemStatus message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.SystemStatus
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.SystemStatus} SystemStatus
             */
            SystemStatus.fromObject = undefined;
            };

            /**
             * Creates a plain object from a SystemStatus message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.SystemStatus
             * @static
             * @param {legal.api.SystemStatus} message SystemStatus
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SystemStatus.toObject = undefined;
            };

            /**
             * Converts this SystemStatus to JSON.
             * @function toJSON
             * @memberof legal.api.SystemStatus
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SystemStatus.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SystemStatus
             * @function getTypeUrl
             * @memberof legal.api.SystemStatus
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SystemStatus.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.SystemStatus";
            };

            return SystemStatus;
        })();

        api.BatchRequest = (function() {

            /**
             * Properties of a BatchRequest.
             * @memberof legal.api
             * @interface IBatchRequest
             * @property {string|null} [batchId] BatchRequest batchId
             * @property {Array.<legal.api.IBatchOperation>|null} [operations] BatchRequest operations
             * @property {legal.api.IBatchOptions|null} [options] BatchRequest options
             * @property {string|null} [userId] BatchRequest userId
             */

            /**
             * Constructs a new BatchRequest.
             * @memberof legal.api
             * @classdesc Represents a BatchRequest.
             * @implements IBatchRequest
             * @constructor
             * @param {legal.api.IBatchRequest=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * BatchRequest batchId.
             * @member {string} batchId
             * @memberof legal.api.BatchRequest
             * @instance
             */
            BatchRequest.prototype.batchId = "";

            /**
             * BatchRequest operations.
             * @member {Array.<legal.api.IBatchOperation>} operations
             * @memberof legal.api.BatchRequest
             * @instance
             */
            BatchRequest.prototype.operations = $util.emptyArray;

            /**
             * BatchRequest options.
             * @member {legal.api.IBatchOptions|null|undefined} options
             * @memberof legal.api.BatchRequest
             * @instance
             */
            BatchRequest.prototype.options = null;

            /**
             * BatchRequest userId.
             * @member {string} userId
             * @memberof legal.api.BatchRequest
             * @instance
             */
            BatchRequest.prototype.userId = "";

            /**
             * Creates a new BatchRequest instance using the specified properties.
             * @function create
             * @memberof legal.api.BatchRequest
             * @static
             * @param {legal.api.IBatchRequest=} [properties] Properties to set
             * @returns {legal.api.BatchRequest} BatchRequest instance
             */
            BatchRequest.create = function create(properties) {
                return new BatchRequest(properties);
            };

            /**
             * Encodes the specified BatchRequest message. Does not implicitly {@link legal.api.BatchRequest.verify|verify} messages.
             * @function encode
             * @memberof legal.api.BatchRequest
             * @static
             * @param {legal.api.IBatchRequest} message BatchRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BatchRequest.encode = undefined;
            };

            /**
             * Encodes the specified BatchRequest message, length delimited. Does not implicitly {@link legal.api.BatchRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.BatchRequest
             * @static
             * @param {legal.api.IBatchRequest} message BatchRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BatchRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a BatchRequest message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.BatchRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.BatchRequest} BatchRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BatchRequest.decode = undefined;
            };

            /**
             * Decodes a BatchRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.BatchRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.BatchRequest} BatchRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BatchRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a BatchRequest message.
             * @function verify
             * @memberof legal.api.BatchRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            BatchRequest.verify = undefined;
            };

            /**
             * Creates a BatchRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.BatchRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.BatchRequest} BatchRequest
             */
            BatchRequest.fromObject = undefined;
            };

            /**
             * Creates a plain object from a BatchRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.BatchRequest
             * @static
             * @param {legal.api.BatchRequest} message BatchRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            BatchRequest.toObject = undefined;
            };

            /**
             * Converts this BatchRequest to JSON.
             * @function toJSON
             * @memberof legal.api.BatchRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            BatchRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for BatchRequest
             * @function getTypeUrl
             * @memberof legal.api.BatchRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            BatchRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.BatchRequest";
            };

            return BatchRequest;
        })();

        api.BatchOperation = (function() {

            /**
             * Properties of a BatchOperation.
             * @memberof legal.api
             * @interface IBatchOperation
             * @property {string|null} [operationId] BatchOperation operationId
             * @property {string|null} [type] BatchOperation type
             * @property {Object.<string,string>|null} [parameters] BatchOperation parameters
             */

            /**
             * Constructs a new BatchOperation.
             * @memberof legal.api
             * @classdesc Represents a BatchOperation.
             * @implements IBatchOperation
             * @constructor
             * @param {legal.api.IBatchOperation=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * BatchOperation operationId.
             * @member {string} operationId
             * @memberof legal.api.BatchOperation
             * @instance
             */
            BatchOperation.prototype.operationId = "";

            /**
             * BatchOperation type.
             * @member {string} type
             * @memberof legal.api.BatchOperation
             * @instance
             */
            BatchOperation.prototype.type = "";

            /**
             * BatchOperation parameters.
             * @member {Object.<string,string>} parameters
             * @memberof legal.api.BatchOperation
             * @instance
             */
            BatchOperation.prototype.parameters = $util.emptyObject;

            /**
             * Creates a new BatchOperation instance using the specified properties.
             * @function create
             * @memberof legal.api.BatchOperation
             * @static
             * @param {legal.api.IBatchOperation=} [properties] Properties to set
             * @returns {legal.api.BatchOperation} BatchOperation instance
             */
            BatchOperation.create = function create(properties) {
                return new BatchOperation(properties);
            };

            /**
             * Encodes the specified BatchOperation message. Does not implicitly {@link legal.api.BatchOperation.verify|verify} messages.
             * @function encode
             * @memberof legal.api.BatchOperation
             * @static
             * @param {legal.api.IBatchOperation} message BatchOperation message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BatchOperation.encode = undefined;
            };

            /**
             * Encodes the specified BatchOperation message, length delimited. Does not implicitly {@link legal.api.BatchOperation.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.BatchOperation
             * @static
             * @param {legal.api.IBatchOperation} message BatchOperation message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BatchOperation.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a BatchOperation message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.BatchOperation
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.BatchOperation} BatchOperation
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BatchOperation.decode = undefined;
            };

            /**
             * Decodes a BatchOperation message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.BatchOperation
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.BatchOperation} BatchOperation
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BatchOperation.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a BatchOperation message.
             * @function verify
             * @memberof legal.api.BatchOperation
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            BatchOperation.verify = undefined;
            };

            /**
             * Creates a BatchOperation message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.BatchOperation
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.BatchOperation} BatchOperation
             */
            BatchOperation.fromObject = undefined;
            };

            /**
             * Creates a plain object from a BatchOperation message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.BatchOperation
             * @static
             * @param {legal.api.BatchOperation} message BatchOperation
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            BatchOperation.toObject = undefined;
            };

            /**
             * Converts this BatchOperation to JSON.
             * @function toJSON
             * @memberof legal.api.BatchOperation
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            BatchOperation.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for BatchOperation
             * @function getTypeUrl
             * @memberof legal.api.BatchOperation
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            BatchOperation.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.BatchOperation";
            };

            return BatchOperation;
        })();

        api.BatchOptions = (function() {

            /**
             * Properties of a BatchOptions.
             * @memberof legal.api
             * @interface IBatchOptions
             * @property {boolean|null} [parallelExecution] BatchOptions parallelExecution
             * @property {number|null} [maxConcurrency] BatchOptions maxConcurrency
             * @property {number|null} [timeoutSeconds] BatchOptions timeoutSeconds
             * @property {boolean|null} [continueOnError] BatchOptions continueOnError
             */

            /**
             * Constructs a new BatchOptions.
             * @memberof legal.api
             * @classdesc Represents a BatchOptions.
             * @implements IBatchOptions
             * @constructor
             * @param {legal.api.IBatchOptions=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * BatchOptions parallelExecution.
             * @member {boolean} parallelExecution
             * @memberof legal.api.BatchOptions
             * @instance
             */
            BatchOptions.prototype.parallelExecution = $state(false);

            /**
             * BatchOptions maxConcurrency.
             * @member {number} maxConcurrency
             * @memberof legal.api.BatchOptions
             * @instance
             */
            BatchOptions.prototype.maxConcurrency = 0;

            /**
             * BatchOptions timeoutSeconds.
             * @member {number} timeoutSeconds
             * @memberof legal.api.BatchOptions
             * @instance
             */
            BatchOptions.prototype.timeoutSeconds = 0;

            /**
             * BatchOptions continueOnError.
             * @member {boolean} continueOnError
             * @memberof legal.api.BatchOptions
             * @instance
             */
            BatchOptions.prototype.continueOnError = $state(false);

            /**
             * Creates a new BatchOptions instance using the specified properties.
             * @function create
             * @memberof legal.api.BatchOptions
             * @static
             * @param {legal.api.IBatchOptions=} [properties] Properties to set
             * @returns {legal.api.BatchOptions} BatchOptions instance
             */
            BatchOptions.create = function create(properties) {
                return new BatchOptions(properties);
            };

            /**
             * Encodes the specified BatchOptions message. Does not implicitly {@link legal.api.BatchOptions.verify|verify} messages.
             * @function encode
             * @memberof legal.api.BatchOptions
             * @static
             * @param {legal.api.IBatchOptions} message BatchOptions message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BatchOptions.encode = undefined;
            };

            /**
             * Encodes the specified BatchOptions message, length delimited. Does not implicitly {@link legal.api.BatchOptions.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.BatchOptions
             * @static
             * @param {legal.api.IBatchOptions} message BatchOptions message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BatchOptions.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a BatchOptions message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.BatchOptions
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.BatchOptions} BatchOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BatchOptions.decode = undefined;
            };

            /**
             * Decodes a BatchOptions message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.BatchOptions
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.BatchOptions} BatchOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BatchOptions.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a BatchOptions message.
             * @function verify
             * @memberof legal.api.BatchOptions
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            BatchOptions.verify = undefined;
            };

            /**
             * Creates a BatchOptions message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.BatchOptions
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.BatchOptions} BatchOptions
             */
            BatchOptions.fromObject = undefined;
            };

            /**
             * Creates a plain object from a BatchOptions message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.BatchOptions
             * @static
             * @param {legal.api.BatchOptions} message BatchOptions
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            BatchOptions.toObject = undefined;
            };

            /**
             * Converts this BatchOptions to JSON.
             * @function toJSON
             * @memberof legal.api.BatchOptions
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            BatchOptions.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for BatchOptions
             * @function getTypeUrl
             * @memberof legal.api.BatchOptions
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            BatchOptions.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.BatchOptions";
            };

            return BatchOptions;
        })();

        api.BatchResponse = (function() {

            /**
             * Properties of a BatchResponse.
             * @memberof legal.api
             * @interface IBatchResponse
             * @property {string|null} [batchId] BatchResponse batchId
             * @property {legal.api.BatchStatus|null} [status] BatchResponse status
             * @property {Array.<legal.api.IBatchResult>|null} [results] BatchResponse results
             * @property {google.protobuf.ITimestamp|null} [startedAt] BatchResponse startedAt
             * @property {google.protobuf.ITimestamp|null} [completedAt] BatchResponse completedAt
             * @property {string|null} [errorMessage] BatchResponse errorMessage
             */

            /**
             * Constructs a new BatchResponse.
             * @memberof legal.api
             * @classdesc Represents a BatchResponse.
             * @implements IBatchResponse
             * @constructor
             * @param {legal.api.IBatchResponse=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * BatchResponse batchId.
             * @member {string} batchId
             * @memberof legal.api.BatchResponse
             * @instance
             */
            BatchResponse.prototype.batchId = "";

            /**
             * BatchResponse status.
             * @member {legal.api.BatchStatus} status
             * @memberof legal.api.BatchResponse
             * @instance
             */
            BatchResponse.prototype.status = 0;

            /**
             * BatchResponse results.
             * @member {Array.<legal.api.IBatchResult>} results
             * @memberof legal.api.BatchResponse
             * @instance
             */
            BatchResponse.prototype.results = $util.emptyArray;

            /**
             * BatchResponse startedAt.
             * @member {google.protobuf.ITimestamp|null|undefined} startedAt
             * @memberof legal.api.BatchResponse
             * @instance
             */
            BatchResponse.prototype.startedAt = null;

            /**
             * BatchResponse completedAt.
             * @member {google.protobuf.ITimestamp|null|undefined} completedAt
             * @memberof legal.api.BatchResponse
             * @instance
             */
            BatchResponse.prototype.completedAt = null;

            /**
             * BatchResponse errorMessage.
             * @member {string} errorMessage
             * @memberof legal.api.BatchResponse
             * @instance
             */
            BatchResponse.prototype.errorMessage = "";

            /**
             * Creates a new BatchResponse instance using the specified properties.
             * @function create
             * @memberof legal.api.BatchResponse
             * @static
             * @param {legal.api.IBatchResponse=} [properties] Properties to set
             * @returns {legal.api.BatchResponse} BatchResponse instance
             */
            BatchResponse.create = function create(properties) {
                return new BatchResponse(properties);
            };

            /**
             * Encodes the specified BatchResponse message. Does not implicitly {@link legal.api.BatchResponse.verify|verify} messages.
             * @function encode
             * @memberof legal.api.BatchResponse
             * @static
             * @param {legal.api.IBatchResponse} message BatchResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BatchResponse.encode = undefined;
            };

            /**
             * Encodes the specified BatchResponse message, length delimited. Does not implicitly {@link legal.api.BatchResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.BatchResponse
             * @static
             * @param {legal.api.IBatchResponse} message BatchResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BatchResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a BatchResponse message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.BatchResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.BatchResponse} BatchResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BatchResponse.decode = undefined;
            };

            /**
             * Decodes a BatchResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.BatchResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.BatchResponse} BatchResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BatchResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a BatchResponse message.
             * @function verify
             * @memberof legal.api.BatchResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            BatchResponse.verify = undefined;
            };

            /**
             * Creates a BatchResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.BatchResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.BatchResponse} BatchResponse
             */
            BatchResponse.fromObject = undefined;
            };

            /**
             * Creates a plain object from a BatchResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.BatchResponse
             * @static
             * @param {legal.api.BatchResponse} message BatchResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            BatchResponse.toObject = undefined;
            };

            /**
             * Converts this BatchResponse to JSON.
             * @function toJSON
             * @memberof legal.api.BatchResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            BatchResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for BatchResponse
             * @function getTypeUrl
             * @memberof legal.api.BatchResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            BatchResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.BatchResponse";
            };

            return BatchResponse;
        })();

        /**
         * BatchStatus enum.
         * @name legal.api.BatchStatus
         * @enum {number}
         * @property {number} BATCH_STATUS_PENDING=0 BATCH_STATUS_PENDING value
         * @property {number} BATCH_STATUS_RUNNING=1 BATCH_STATUS_RUNNING value
         * @property {number} BATCH_STATUS_COMPLETED=2 BATCH_STATUS_COMPLETED value
         * @property {number} BATCH_STATUS_FAILED=3 BATCH_STATUS_FAILED value
         * @property {number} BATCH_STATUS_CANCELLED=4 BATCH_STATUS_CANCELLED value
         */
        api.BatchStatus = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "BATCH_STATUS_PENDING"] = 0;
            values[valuesById[1] = "BATCH_STATUS_RUNNING"] = 1;
            values[valuesById[2] = "BATCH_STATUS_COMPLETED"] = 2;
            values[valuesById[3] = "BATCH_STATUS_FAILED"] = 3;
            values[valuesById[4] = "BATCH_STATUS_CANCELLED"] = 4;
            return values;
        })();

        api.BatchResult = (function() {

            /**
             * Properties of a BatchResult.
             * @memberof legal.api
             * @interface IBatchResult
             * @property {string|null} [operationId] BatchResult operationId
             * @property {boolean|null} [success] BatchResult success
             * @property {string|null} [resultData] BatchResult resultData
             * @property {string|null} [errorMessage] BatchResult errorMessage
             * @property {number|null} [processingTimeMs] BatchResult processingTimeMs
             */

            /**
             * Constructs a new BatchResult.
             * @memberof legal.api
             * @classdesc Represents a BatchResult.
             * @implements IBatchResult
             * @constructor
             * @param {legal.api.IBatchResult=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * BatchResult operationId.
             * @member {string} operationId
             * @memberof legal.api.BatchResult
             * @instance
             */
            BatchResult.prototype.operationId = "";

            /**
             * BatchResult success.
             * @member {boolean} success
             * @memberof legal.api.BatchResult
             * @instance
             */
            BatchResult.prototype.success = $state(false);

            /**
             * BatchResult resultData.
             * @member {string} resultData
             * @memberof legal.api.BatchResult
             * @instance
             */
            BatchResult.prototype.resultData = "";

            /**
             * BatchResult errorMessage.
             * @member {string} errorMessage
             * @memberof legal.api.BatchResult
             * @instance
             */
            BatchResult.prototype.errorMessage = "";

            /**
             * BatchResult processingTimeMs.
             * @member {number} processingTimeMs
             * @memberof legal.api.BatchResult
             * @instance
             */
            BatchResult.prototype.processingTimeMs = 0;

            /**
             * Creates a new BatchResult instance using the specified properties.
             * @function create
             * @memberof legal.api.BatchResult
             * @static
             * @param {legal.api.IBatchResult=} [properties] Properties to set
             * @returns {legal.api.BatchResult} BatchResult instance
             */
            BatchResult.create = function create(properties) {
                return new BatchResult(properties);
            };

            /**
             * Encodes the specified BatchResult message. Does not implicitly {@link legal.api.BatchResult.verify|verify} messages.
             * @function encode
             * @memberof legal.api.BatchResult
             * @static
             * @param {legal.api.IBatchResult} message BatchResult message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BatchResult.encode = undefined;
            };

            /**
             * Encodes the specified BatchResult message, length delimited. Does not implicitly {@link legal.api.BatchResult.verify|verify} messages.
             * @function encodeDelimited
             * @memberof legal.api.BatchResult
             * @static
             * @param {legal.api.IBatchResult} message BatchResult message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BatchResult.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a BatchResult message from the specified reader or buffer.
             * @function decode
             * @memberof legal.api.BatchResult
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {legal.api.BatchResult} BatchResult
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BatchResult.decode = undefined;
            };

            /**
             * Decodes a BatchResult message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof legal.api.BatchResult
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {legal.api.BatchResult} BatchResult
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BatchResult.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a BatchResult message.
             * @function verify
             * @memberof legal.api.BatchResult
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            BatchResult.verify = undefined;
            };

            /**
             * Creates a BatchResult message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof legal.api.BatchResult
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {legal.api.BatchResult} BatchResult
             */
            BatchResult.fromObject = undefined;
            };

            /**
             * Creates a plain object from a BatchResult message. Also converts values to other types if specified.
             * @function toObject
             * @memberof legal.api.BatchResult
             * @static
             * @param {legal.api.BatchResult} message BatchResult
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            BatchResult.toObject = undefined;
            };

            /**
             * Converts this BatchResult to JSON.
             * @function toJSON
             * @memberof legal.api.BatchResult
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            BatchResult.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for BatchResult
             * @function getTypeUrl
             * @memberof legal.api.BatchResult
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            BatchResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/legal.api.BatchResult";
            };

            return BatchResult;
        })();

        return api;
    })();

    return legal;
})();

export const google = $root.google = (() => {

    /**
     * Namespace google.
     * @exports google
     * @namespace
     */
    const google = {};

    google.protobuf = (function() {

        /**
         * Namespace protobuf.
         * @memberof google
         * @namespace
         */
        const protobuf = {};

        protobuf.Timestamp = (function() {

            /**
             * Properties of a Timestamp.
             * @memberof google.protobuf
             * @interface ITimestamp
             * @property {number|Long|null} [seconds] Timestamp seconds
             * @property {number|null} [nanos] Timestamp nanos
             */

            /**
             * Constructs a new Timestamp.
             * @memberof google.protobuf
             * @classdesc Represents a Timestamp.
             * @implements ITimestamp
             * @constructor
             * @param {google.protobuf.ITimestamp=} [properties] Properties to set
             */
            undefined;
            }

            /**
             * Timestamp seconds.
             * @member {number|Long} seconds
             * @memberof google.protobuf.Timestamp
             * @instance
             */
            Timestamp.prototype.seconds = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Timestamp nanos.
             * @member {number} nanos
             * @memberof google.protobuf.Timestamp
             * @instance
             */
            Timestamp.prototype.nanos = 0;

            /**
             * Creates a new Timestamp instance using the specified properties.
             * @function create
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp=} [properties] Properties to set
             * @returns {google.protobuf.Timestamp} Timestamp instance
             */
            Timestamp.create = function create(properties) {
                return new Timestamp(properties);
            };

            /**
             * Encodes the specified Timestamp message. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @function encode
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp} message Timestamp message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Timestamp.encode = undefined;
            },;

            /**
             * Encodes the specified Timestamp message, length delimited. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @function encodeDelimited
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp} message Timestamp message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Timestamp.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Timestamp message from the specified reader or buffer.
             * @function decode
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {google.protobuf.Timestamp} Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Timestamp.decode = undefined;
            },;

            /**
             * Decodes a Timestamp message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {google.protobuf.Timestamp} Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Timestamp.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Timestamp message.
             * @function verify
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Timestamp.verify = undefined;
            };

            /**
             * Creates a Timestamp message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {google.protobuf.Timestamp} Timestamp
             */
            Timestamp.fromObject = undefined;
            };

            /**
             * Creates a plain object from a Timestamp message. Also converts values to other types if specified.
             * @function toObject
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.Timestamp} message Timestamp
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Timestamp.toObject = undefined;
            };

            /**
             * Converts this Timestamp to JSON.
             * @function toJSON
             * @memberof google.protobuf.Timestamp
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Timestamp.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Timestamp
             * @function getTypeUrl
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Timestamp.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/google.protobuf.Timestamp";
            };

            return Timestamp;
        })();

        return protobuf;
    })();

    return google;
})();

export { $root as default };
