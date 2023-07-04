//
//  BBCoreConstants.h
//  BBCore
//
//  Created by Gabor Detari on 9/24/20.
//  Copyright © 2020 Backbase R&D B.V. All rights reserved.
//

/// Defines logLevels for logging the SDK activity.
typedef NS_ENUM(NSUInteger, BBLogLevel) {
    /// Suppress all internal logs
    BBLogLevelNone = 0,
    /// Only display internal error messages
    BBLogLevelError,
    /// Only display internal error and warnings messages
    BBLogLevelWarn,
    /// Only display internal information, warning and errors messages
    BBLogLevelInfo,
    /// Only display internal debug, information, warning and errors messages
    BBLogLevelDebug,
    /// Logs everything, this is the default value.
    BBLogLevelEverything
};
