//
//  Plugin.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 14/04/15.
//

#import <Foundation/Foundation.h>

#ifndef PLUGIN_CLASS
#define PLUGIN_CLASS

/**
 * Plugin base protocol.
 * All native-to-javascript plugins MUST specify the methods to expose in a protocol that extends this one, and
 * implement them in a class that extends from the Plugin base class.
 * All methods exposed should be required and instance type (non-static).
 * As a recommendation, name the plugin protocols as FunctionalitySpec in this way will be clear that the plugin class
 * will provide an implementation for the specification.
 */
@protocol Plugin <NSObject>
@end

/**
 * Plugin base class.
 * All native-to-javascript plugins MUST extend this class and be registered for use using the Backbase class.
 * This class provides internal means to expose the information required by the widgets to enable the javascript
 * counterparts.
 * Additionally, it provides 2 methods that need to be used by any implementation in order to notify javascript that
 * the native part is done and is ready to process the data gathered on the native land, or the native operation fail
 * and for what reason.
 */
@interface Plugin : NSObject

/**
 * Initializes a plugin instance to pass parameters that might be changing during the runtime.
 * @param parameters A dictionary string-objects with the parameters this plugin depends on.
 * @discussion A plugin might require context specific parameters, for instance, the current view controller. For
 * this kind of parameters this method allows the developers remain reactive to the context they are running into. It's
 * responsibility of the developer to invoke this method when necessary. Also it's responsibility of the developer
 * to determine what to do if the required parameters weren't passed at the moment a plugin function is called.
 */
- (void)initialize:(NSDictionary* _Nullable)parameters;

/**
 * Notifies that the plugin has finished successfully.
 * It might pass a JSON-compatible object (or nil) and the function that was successfully finished in selector form.
 * It's responsibility of the developer to call the error method in the exposed plugins.
 * @param jsonCompatibleObject a JSON payload to be passed to the Javascript invoker of the plugin.
 * @param callbackId The callbackId that this invocation refers to.
 */
- (void)success:(id _Nullable)jsonCompatibleObject callbackId:(NSString* _Nonnull)callbackId;

/**
 * Notifies that the plugin has finished successfully.
 * It might pass a JSON-compatible object (or nil) and the function that was successfully finished in selector form.
 * It's responsibility of the developer to call the error method in the exposed plugins.
 * @param jsonCompatibleObject a JSON payload to be passed to the Javascript invoker of the plugin.
 * @param callbackId The callbackId that this invocation refers to.
 * @param keep Keep the callbackId in the queue, by default it's removed
 */
- (void)success:(id _Nullable)jsonCompatibleObject callbackId:(NSString* _Nonnull)callbackId keep:(BOOL)keep;

/**
 * Notifies that the plugin has finished with an error.
 * It might pass a JSON-compatible object (or nil) and the function that was failed in selector form.
 * It's responsibility of the developer to call the success method in the exposed plugins.
 * @param jsonCompatibleObject a JSON payload to be passed to the Javascript invoker of the plugin.
 * @param callbackId The callbackId that this invocation refers to.
 */
- (void)error:(id _Nullable)jsonCompatibleObject callbackId:(NSString* _Nonnull)callbackId;

/**
 * Notifies that the plugin has finished with an error.
 * It might pass a JSON-compatible object (or nil) and the function that was failed in selector form.
 * It's responsibility of the developer to call the success method in the exposed plugins.
 * @param jsonCompatibleObject a JSON payload to be passed to the Javascript invoker of the plugin.
 * @param callbackId The callbackId that this invocation refers to.
 * @param keep Keep the callbackId in the queue, by default it's removed
 */
- (void)error:(id _Nullable)jsonCompatibleObject callbackId:(NSString* _Nonnull)callbackId keep:(BOOL)keep;

@end

#endif
