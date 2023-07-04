//
//  Model.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 23/02/15.
//

#import <Foundation/Foundation.h>

/**
 * Model protocol. The conforming object will have the ability to retrieve/manipulate renderable
 * objects out of a portal model.
 */
@protocol Model <NSObject>
@required
/**
 * Retrieves all the widgets present in the model.
 * @return A dictionary of NSString* -> id<Renderable> objects that are widgets in the hierarchy.
 */
- (NSDictionary<NSString*, NSObject<Renderable>*>* _Nonnull)allWidgets;

/**
 * Retrieves all the layouts present in the model.
 * @return A dictionary of NSString* -> id<Renderable> objects that are layouts in the hierarchy.
 */
- (NSDictionary<NSString*, NSObject<Renderable>*>* _Nonnull)allLayouts;

/**
 * Retrieves all the pages present in the model.
 * @return A dictionary of NSString* -> id<Renderable> objects that are pages in the hierarchy.
 */
- (NSDictionary<NSString*, NSObject<Renderable>*>* _Nonnull)allPages;

/**
 * Retrieves a list of all items with a preload preference set to true. All items returned conform to the Renderable
 * protocol.
 * @return A list of elements with a preload preference set to true.
 */
- (NSArray<NSObject<Renderable>*>* _Nonnull)allPreloadItems;

/**
 * Retrieves the app object from the model, a.k.a. top level object
 * @return The root object of the model.
 */
- (NSObject<Renderable>* _Nonnull)app;

/**
 * Retrieves the first element in the hierarchy with the identifier given.
 * @param identifier The identifier of the object to search for.
 * @return The first object with the given identifier. nil if there is no object with such
 * identifier.
 */
- (NSObject<Renderable>* _Nullable)itemById:(NSString* _Nonnull)identifier;

/**
 * Retrieves the page Id where the widget id is residing.
 * @param widgetId The widget id that has to be searched for.
 * @return The page id that contains the given widget. Nil if not found.
 */
- (NSString* _Nullable)resolvePageIdForWidgetId:(NSString* _Nonnull)widgetId;

/**
 * Retrieves the names of all site maps available in the model. The order of this array is consistent with the order
 * in the model retrieved from the server.
 * @return A list of site map names.
 */
- (NSArray<NSString*>* _Nonnull)siteMapNames;

/**
 * Retrieves the sitemap children of a given sitemap name. All elements in the array conform the SiteMapItemChild
 * protocol which allows a full traversal of the requested sitemap.
 * @param sitemapName The name of the sitempa to retrieve the children from.
 * @return An array of NSObject<SiteMapItemChild>* objects for further processing.
 */
- (NSArray<NSObject<SiteMapItemChild>*>* _Nonnull)siteMapItemChildrenFor:(SiteMapSection _Nonnull)sitemapName;

@end
