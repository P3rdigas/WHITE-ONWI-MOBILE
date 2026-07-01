// import { Injectable } from '@angular/core';
// import { SQLite, SQLiteObject } from '@ionic-native/sqlite/ngx';
// import { AlertController } from '@ionic/angular';
// import { Events } from '../events/events';

import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { AlertController, Platform } from '@ionic/angular';
import { Events } from '../events/events';

// @Injectable({
//   providedIn: 'root'
// })
// export class SqliteService {
//   private db: SQLiteObject;

//   constructor(
//     private sqlite: SQLite,
//     private alertController: AlertController,
//     private events: Events
//   ) { }

@Injectable({
  providedIn: 'root'
})
export class SqliteService {
    private sqlite: SQLiteConnection;
    private db: SQLiteDBConnection | null = null;
    private readonly dbName: string = 'onwi.db';
    private readonly downloadStatusTables = [
      'library',
      'myDocuments',
      'myFavorites',
      'lastDocsDistributed'
    ] as const;

    constructor(
        private alertController: AlertController,
        private events: Events,
        private platform: Platform
    ) {
        this.sqlite = new SQLiteConnection(CapacitorSQLite);
    }

  async initBD(): Promise<SQLiteDBConnection> {
    if (this.db) {
      return this.db;
    }

    try {
      await this.platform.ready();

      const consistency = await this.sqlite.checkConnectionsConsistency();
      const isConn = await this.sqlite.isConnection(this.dbName, false);

      if (consistency.result && isConn.result) {
        this.db = await this.sqlite.retrieveConnection(this.dbName, false);
      } else {
        this.db = await this.sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
      }

      await this.db.open();
      await this.createTables();
      await this.verifyTables();

      return this.db;
    } catch (error: any) {
      const alert = await this.alertController.create({
        cssClass: 'alertAlphacode',
        header: 'Something went wrong',
        message: 'There was a problem connecting to the database. Wait a moment.',
        buttons: ['OK']
      });
      await alert.present();
      throw error;
    }
  }

  async updateLibraryList(documents: any[]): Promise<void> {
    return this.upsertDocumentList('library', 'DocumentID', documents, (doc) => ({
      columns: [
        'DocumentID', 'DocumentFavorite', 'DocumentFavoriteID', 'DocumentType',
        'DownloadStatus', 'DocumentVersionID', 'DocumentVersionIcon', 'DocumentTag',
        'DocumentDesignation', 'DocumentVersion', 'DocumentVersionHash',
        'DocumentVersionFileID', 'DocumentVersionIsLastVersion', 'DocumentVersionExtension',
        'DocumentVersionFileName', 'DocumentFolderID', 'DocumentURLUser', 'DocumentURLPassword'
      ],
      values: [
        doc.DocumentID, doc.DocumentFavorite, doc.DocumentFavoriteID, doc.DocumentType,
        doc.DownloadStatus, doc.DocumentLastVersionID, doc.DocumentVersionIcon, doc.DocumentTag,
        doc.DocumentDesignation, doc.DocumentVersion, doc.DocumentVersionHash,
        doc.DocumentVersionFileID, doc.DocumentVersionIsLastVersion ? 1 : 0,
        doc.DocumentVersionExtension, doc.DocumentVersionFileName, doc.DocumentFolderID,
        doc.DocumentURLUser, doc.DocumentURLPassword
      ]
    }));
  }

  // TODO: Use DocumentDate for distribution instead of DocumentReceivedDate (date that the user accepted the document)
  async updateMyDocumentsList(documents: any[]): Promise<void> {
    return this.upsertDocumentList('myDocuments', 'DocumentID', documents, (doc) => ({
      columns: [
        'DocumentID', 'DocumentFavorite', 'DocumentFavoriteID', 'DocumentType',
        'DownloadStatus', 'DocumentVersionID', 'DocumentVersionIcon', 'DocumentTag',
        'DocumentDesignation', 'DocumentReference', 'DocumentDescription', 'DocumentVersion',
        'DocumentVersionHash', 'DocumentVersionFileID', 'DocumentVersionIsLastVersion',
        'DocumentVersionExtension', 'DocumentVersionFileName', 'DocumentFolderID',
        'DocumentURLUser', 'DocumentURLPassword', 'DocumentReceivedDate'
      ],
      values: [
        doc.DocumentID, doc.DocumentFavorite, doc.DocumentFavoriteID, doc.DocumentType,
        doc.DownloadStatus, doc.DocumentVersionID, doc.DocumentVersionIcon, doc.DocumentTag,
        doc.DocumentDesignation, doc.DocumentReference, doc.DocumentDescription,
        doc.DocumentVersion, doc.DocumentVersionHash, doc.DocumentVersionFileID,
        doc.DocumentVersionIsLastVersion ? 1 : 0, doc.DocumentVersionExtension,
        doc.DocumentVersionFileName, doc.DocumentFolderID, doc.DocumentURLUser,
        doc.DocumentURLPassword, doc.ReceivedDate
      ]
    }));
  }

  async updateMyFavoritesList(documents: any[]): Promise<void> {
    return this.upsertDocumentList('myFavorites', 'DocumentID', documents, (doc) => ({
      columns: [
      'DocumentID', 'DocumentFavorite', 'DocumentFavoriteID', 'DocumentType',
      'DownloadStatus', 'DocumentVersionID', 'DocumentVersionIcon', 'DocumentTag',
      'DocumentDesignation', 'DocumentReference', 'DocumentDescription',
      'DocumentVersion', 'DocumentVersionHash', 'DocumentVersionFileID',
      'DocumentVersionIsLastVersion', 'DocumentVersionExtension', 'DocumentVersionFileName',
      'DocumentFolderID', 'DocumentURLUser', 'DocumentURLPassword'
      ],
      values: [
        doc.DocumentID, doc.DocumentFavorite, doc.DocumentFavoriteID, doc.DocumentType,
        doc.DownloadStatus, doc.DocumentVersionID, doc.DocumentVersionIcon, doc.DocumentTag,
        doc.DocumentDesignation, doc.DocumentReference, doc.DocumentDescription,
        doc.DocumentVersion, doc.DocumentVersionHash, doc.DocumentVersionFileID,
        doc.DocumentVersionIsLastVersion ? 1 : 0, doc.DocumentVersionExtension,
        doc.DocumentVersionFileName, doc.DocumentFolderID, doc.DocumentURLUser,
        doc.DocumentURLPassword
      ]
    }));
  }

  async updateLastDocsDistributedList(documents: any[]): Promise<void> {
    return this.upsertDocumentList('lastDocsDistributed', 'DocumentID', documents, (doc) => ({
      columns: [
        'DistributionID', 'DocumentID', 'DocumentFavorite', 'DocumentFavoriteID',
        'DocumentType', 'DownloadStatus', 'DocumentVersionID', 'DocumentVersionIcon',
        'DocumentTag', 'DocumentDesignation', 'DocumentReference', 'DocumentDescription',
        'DocumentVersion', 'DocumentVersionHash', 'DocumentVersionFileID',
        'DocumentVersionIsLastVersion', 'DocumentVersionExtension', 'DocumentVersionFileName',
        'DocumentFolderID', 'DocumentURLUser', 'DocumentURLPassword',
        'isReceived', 'wasUnderstood', 'Comments'
      ],
      values: [
        doc.ID, doc.DocumentID, doc.DocumentFavorite, doc.DocumentFavoriteID,
        doc.DocumentType, doc.DownloadStatus, doc.DocumentVersionID, doc.DocumentVersionIcon,
        doc.DocumentTag, doc.DocumentDesignation, doc.DocumentReference, doc.DocumentDescription,
        doc.DocumentVersion, doc.DocumentVersionHash, doc.DocumentVersionFileID,
        doc.DocumentVersionIsLastVersion ? 1 : 0, doc.DocumentVersionExtension,
        doc.DocumentVersionFileName, doc.DocumentFolderID, doc.DocumentURLUser,
        doc.DocumentURLPassword, doc.isReceived ? 1 : 0, doc.wasUnderstood ? 1 : 0,
        doc.Comments
      ]
    }));
  }

  async updatePermissionsList(permissions: any[]): Promise<void> {
    return this.upsertDocumentList('documentsPermissions', 'PermissionID', permissions, (permission) => ({
      columns: [
        'DepartmentUserID', 'DocumentID', 'PermissionID', 'RoleUserID', 'UserID',
        'canDownload', 'canEdit', 'canPrint', 'canView'
      ],
      values: [
        permission.DepartmentUserID, permission.DocumentID, permission.ID,
        permission.RoleUserID, permission.UserID,
        permission.canDownload ? 1 : 0, permission.canEdit ? 1 : 0,
        permission.canPrint ? 1 : 0, permission.canView ? 1 : 0
      ]
    }));
  }

  async updateFoldersList(folders: any[]): Promise<void> {
    await this.upsertDocumentList('folders', 'FolderID', folders, (folder) => ({
      columns: ['FolderID', 'ParentFolderID', 'IsEnabled', 'Name', 'Color', 'BackColor', 'Image'],
      values: [folder.ID, folder.ParentFolderID, folder.IsEnabled ? 1 : 0, folder.Name, folder.Color, folder.BackColor, folder.Image]
    }));
  }

  async getLibrary(DocumentID?: string): Promise<any[]> {
    return this.queryTable('library', 'DocumentID', DocumentID);
  }

  async getMyDocuments(DocumentID?: string, DocumentVersionFileID?: string): Promise<any[]> {
    return this.searchInTable('myDocuments', DocumentID, DocumentVersionFileID);
  }

  async getMyFavorites(DocumentID?: string, DocumentVersionFileID?: string): Promise<any[]> {
    return this.searchInTable('myFavorites', DocumentID, DocumentVersionFileID);
  }

  async getLastDocsDistributed(DocumentID?: string): Promise<any[]> {
    return this.queryTable('lastDocsDistributed', 'DocumentID', DocumentID);
  }

  async getPermission(DocumentID?: string): Promise<any[]> {
    return this.queryTable('documentsPermissions', 'DocumentID', DocumentID);
  }

  async getFolders(ParentFolderID?: string): Promise<any[]> {
    return this.queryTable('folders', 'ParentFolderID', ParentFolderID);
  }

  async getNextDownload(): Promise<any> {
    const favorite = await this.getNextWaitingFromTable('myFavorites');
    if (favorite) {
      return { status: true, document: favorite, table: 'myFavorites' };
    }

    const doc = await this.getNextWaitingFromTable('myDocuments');
    if (doc) {
      return { status: true, document: doc, table: 'myDocuments' };
    }

    return { status: false };
  }

  async updateDownloadStatus(DocumentID: any, status: any): Promise<void> {
    const db = this.getDbOrThrow();

    console.log('>>>>>>>>>>>>> updateDownloadStatus BEGAN <<<<<<<<<<<<<', DocumentID, status);

    for (const table of this.downloadStatusTables) {
      await db.run(`
        UPDATE ${table} SET DownloadStatus = ? WHERE DocumentID = ?`,
        [status, DocumentID]
      );
    }

    this.events.publish('updateLibrary', true);
    this.events.publish('updateMyDocuments', true);
    this.events.publish('updateMyFavorites', true);
    this.events.publish('updateLastDocs', true);

    console.log('>>>>>>>>>>>>> updateDownloadStatus END <<<<<<<<<<<<<');
  }

  async updateFavoriteDocs(DocumentVersionFileID: any, DocumentFavoriteID: any, status: any, doc?: any): Promise<void> {
    const db = this.getDbOrThrow();

    // Update favorite status across the tables
    for (const table of ['library', 'myDocuments', 'lastDocsDistributed']) {
      await db.run(`
        UPDATE ${table} SET DocumentFavoriteID = ?, DocumentFavorite = ? WHERE DocumentVersionFileID = ?`,
        [DocumentFavoriteID, status ? 1 : 0, DocumentVersionFileID]
      );
    }

    if (status && doc) {
      // TODO: If is a newer version or revision of the document, the older one should be deleted and this one inserted (or maybe just update)
      // Insert into my favorites only if not already there
      const existing = await db.query('SELECT id FROM myFavorites WHERE DocumentVersionFileID = ?', [DocumentVersionFileID]);

      if (!existing.values.length) {
        await db.run(`
          INSERT INTO myFavorites (
            DocumentID,
            DocumentFavorite,
            DocumentFavoriteID,
            DocumentType,
            DownloadStatus,
            DocumentVersionID,
            DocumentVersionIcon,
            DocumentTag,
            DocumentDesignation,
            DocumentReference,
            DocumentDescription,
            DocumentVersion,
            DocumentVersionHash,
            DocumentVersionFileID,
            DocumentVersionIsLastVersion,
            DocumentVersionExtension,
            DocumentVersionFileName,
            DocumentFolderID,
            DocumentURLUser,
            DocumentURLPassword
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            doc.DocumentID,
            doc.DocumentFavorite,
            doc.DocumentFavoriteID,
            doc.DocumentType,
            doc.DownloadStatus,
            doc.DocumentVersionID,
            doc.DocumentVersionIcon,
            doc.DocumentTag,
            doc.DocumentDesignation,
            doc.DocumentReference,
            doc.DocumentDescription,
            doc.DocumentVersion,
            doc.DocumentVersionHash,
            doc.DocumentVersionFileID,
            doc.DocumentVersionIsLastVersion ? 1 : 0,
            doc.DocumentVersionExtension,
            doc.DocumentVersionFileName,
            doc.DocumentFolderID,
            doc.DocumentURLUser,
            doc.DocumentURLPassword
          ]
        );
      }
    } else {
      await db.run('DELETE FROM myFavorites WHERE DocumentVersionFileID = ?', [DocumentVersionFileID]);
    }
  }

  async clearAllRecords(): Promise<void> {
    const db = this.getDbOrThrow();

    const tables = [
      'library',
      'myDocuments',
      'myFavorites',
      'lastDocsDistributed',
      'folders',
      'documentsPermissions'
    ];

    for (const table of tables) {
      await db.run(`DELETE FROM ${table}`);
    }
  }

  private getDbOrThrow() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }
  
  // TODO: In myDocuments use DocumentDate for distribution instead of DocumentReceivedDate (date that the user accepted the document)
  private async createTables(): Promise<void> {
    const db = this.getDbOrThrow();

    // SQLite Datatypes: https://sqlite.org/datatype3.html
    await db.execute(`
      CREATE TABLE IF NOT EXISTS documentsPermissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        DepartmentUserID TEXT DEFAULT NULL,
        DocumentID TEXT DEFAULT NULL,
        PermissionID TEXT DEFAULT NULL,
        RoleUserID TEXT DEFAULT NULL,
        UserID TEXT DEFAULT NULL,
        canDownload INTEGER DEFAULT 0,
        canEdit INTEGER DEFAULT 0,
        canPrint INTEGER DEFAULT 0,
        canView INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS library (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        DocumentID TEXT DEFAULT NULL,
        DocumentFavorite INTEGER DEFAULT 0,
        DocumentFavoriteID TEXT DEFAULT NULL,
        DocumentType TEXT DEFAULT NULL,
        DownloadStatus TEXT DEFAULT NULL,
        DocumentVersionID TEXT DEFAULT NULL,
        DocumentVersionIcon BLOB DEFAULT NULL,
        DocumentTag TEXT DEFAULT NULL,
        DocumentDesignation TEXT DEFAULT NULL,
        DocumentVersion TEXT DEFAULT NULL,
        DocumentVersionHash TEXT DEFAULT NULL,
        DocumentVersionFileID TEXT DEFAULT NULL,
        DocumentVersionIsLastVersion INTEGER DEFAULT 0,
        DocumentVersionExtension TEXT DEFAULT NULL,
        DocumentVersionFileName TEXT DEFAULT NULL,
        DocumentFolderID TEXT DEFAULT NULL,
        DocumentURLUser TEXT DEFAULT NULL,
        DocumentURLPassword TEXT DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS myDocuments (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        DocumentID TEXT DEFAULT NULL,
        DocumentFavorite INTEGER DEFAULT 0,
        DocumentFavoriteID TEXT DEFAULT NULL,
        DocumentType TEXT DEFAULT NULL,
        DownloadStatus TEXT DEFAULT NULL,
        DocumentVersionID TEXT DEFAULT NULL,
        DocumentVersionIcon BLOB DEFAULT NULL,
        DocumentTag TEXT DEFAULT NULL,
        DocumentDesignation TEXT DEFAULT NULL,
        DocumentReference TEXT DEFAULT NULL,
        DocumentDescription TEXT DEFAULT NULL,
        DocumentVersion TEXT DEFAULT NULL,
        DocumentVersionHash TEXT DEFAULT NULL,
        DocumentVersionFileID TEXT DEFAULT NULL,
        DocumentVersionIsLastVersion INTEGER DEFAULT 0,
        DocumentVersionExtension TEXT DEFAULT NULL,
        DocumentVersionFileName TEXT DEFAULT NULL,
        DocumentFolderID TEXT DEFAULT NULL,
        DocumentURLUser TEXT DEFAULT NULL,
        DocumentURLPassword TEXT DEFAULT NULL,
        DocumentReceivedDate TEXT DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS myFavorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        DocumentID TEXT DEFAULT NULL,
        DocumentFavorite INTEGER DEFAULT 0,
        DocumentFavoriteID TEXT DEFAULT NULL,
        DocumentType TEXT DEFAULT NULL,
        DownloadStatus TEXT DEFAULT NULL,
        DocumentVersionID TEXT DEFAULT NULL,
        DocumentVersionIcon BLOB DEFAULT NULL,
        DocumentTag TEXT DEFAULT NULL,
        DocumentDesignation TEXT DEFAULT NULL,
        DocumentReference TEXT DEFAULT NULL,
        DocumentDescription TEXT DEFAULT NULL,
        DocumentVersion TEXT DEFAULT NULL,
        DocumentVersionHash TEXT DEFAULT NULL,
        DocumentVersionFileID TEXT DEFAULT NULL,
        DocumentVersionIsLastVersion INTEGER DEFAULT 0,
        DocumentVersionExtension TEXT DEFAULT NULL,
        DocumentVersionFileName TEXT DEFAULT NULL,
        DocumentFolderID TEXT DEFAULT NULL,
        DocumentURLUser TEXT DEFAULT NULL,
        DocumentURLPassword TEXT DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS lastDocsDistributed (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        DistributionID TEXT DEFAULT NULL,
        DocumentID TEXT DEFAULT NULL,
        DocumentFavorite INTEGER DEFAULT 0,
        DocumentFavoriteID TEXT DEFAULT NULL,
        DocumentType TEXT DEFAULT NULL,
        DownloadStatus TEXT DEFAULT NULL,
        DocumentVersionID TEXT DEFAULT NULL,
        DocumentVersionIcon BLOB DEFAULT NULL,
        DocumentTag TEXT DEFAULT NULL,
        DocumentDesignation TEXT DEFAULT NULL,
        DocumentReference TEXT DEFAULT NULL,
        DocumentDescription TEXT DEFAULT NULL,
        DocumentVersion TEXT DEFAULT NULL,
        DocumentVersionHash TEXT DEFAULT NULL,
        DocumentVersionFileID TEXT DEFAULT NULL,
        DocumentVersionIsLastVersion INTEGER DEFAULT 0,
        DocumentVersionExtension TEXT DEFAULT NULL,
        DocumentVersionFileName TEXT DEFAULT NULL,
        DocumentFolderID TEXT DEFAULT NULL,
        DocumentURLUser TEXT DEFAULT NULL,
        DocumentURLPassword TEXT DEFAULT NULL,
        isReceived INTEGER DEFAULT 0,
        wasUnderstood INTEGER DEFAULT 0,
        Comments TEXT DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        FolderID TEXT DEFAULT NULL,
        ParentFolderID TEXT DEFAULT NULL,
        IsEnabled INTEGER DEFAULT 0,
        Name TEXT DEFAULT NULL,
        Color TEXT DEFAULT NULL,
        BackColor TEXT DEFAULT NULL,
        Image BLOB DEFAULT NULL
      );
    `);
  }

  private async upsertDocumentList(
    tableName: string,
    lookupKey: string = 'DocumentID',
    documents: any[],
    buildValues: (doc: any) => { columns: string[]; values: any[] }
  ): Promise<void> {
    console.log(`>>>>>>>>>>>>> upsertDocumentList ${tableName} BEGAN <<<<<<<<<<<<<`);

    const db = this.getDbOrThrow();

    if (documents && documents.length) {
      const documentsID: number[] = [];

      for (const doc of documents) {
        const existing = await db.query(
          `SELECT id FROM ${tableName} WHERE ${lookupKey} = ?`,
          [doc[lookupKey] ?? doc.DocumentID]
        );

        const { columns, values } = buildValues(doc);

        if (existing.values && existing.values.length) {
          const id = existing.values[0].id;
          documentsID.push(id);

          const setClauses = columns.map(col => `${col} = ?`).join(', ');
          await db.run(
            `UPDATE ${tableName} SET ${setClauses} WHERE id = ?`,
            [...values, id]
          );
        } else {
          const placeholders = columns.map(() => '?').join(', ');
          const insertResult = await db.run(
            `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );

          if (insertResult.changes?.lastId > 0) {
            documentsID.push(insertResult.changes.lastId);
          }
        }
      }

      if (documentsID.length) {
        await db.run(`DELETE FROM ${tableName} WHERE id NOT IN (${documentsID.join(',')})`);
      }
    } else {
      await db.run(`DELETE FROM ${tableName} WHERE id > 0`, []);
    }

    console.log(`>>>>>>>>>>>>> upsertDocumentList ${tableName} ENDED <<<<<<<<<<<<<`);
  }

  private async searchInTable(
    table: 'myDocuments' | 'myFavorites',
    DocumentID?: string,
    DocumentVersionFileID?: string
  ): Promise<any[]> {
    const db = this.getDbOrThrow();

    let result: any;

    if (DocumentID) {
      result = await db.query(`
        SELECT * FROM ${table} WHERE DocumentID = ?`,
        [DocumentID]
      );
    } else if (DocumentVersionFileID) {
      result = await db.query(`
        SELECT * FROM ${table} WHERE DocumentVersionFileID = ?`,
        [DocumentVersionFileID]
      );
    } else {
      result = await db.query(`
        SELECT * FROM ${table}
      `);
    }

    return result.values ?? [];
  }

  private async getNextWaitingFromTable(table: 'myFavorites' | 'myDocuments'): Promise<any | null> {
    const db = this.getDbOrThrow();

    const result = await db.query(`
      SELECT * FROM ${table} WHERE DownloadStatus = ? LIMIT 1`,
      ['Waiting']
    );

    return result.values && result.values.length > 0
      ? result.values[0]
      : null;
  }

  private async queryTable(table: string, whereColumn?: string, whereValue?: string): Promise<any[]> {
    const db = this.getDbOrThrow();

    const result = whereColumn && whereValue
      ? await db.query(`SELECT * FROM ${table} WHERE ${whereColumn} = ?`, [whereValue])
      : await db.query(`SELECT * FROM ${table}`);

    return result.values ?? [];
  }

  // DEBUG FUNCTIONS

  private async verifyTables(): Promise<void> {
    const db = this.getDbOrThrow();

    const tables = ['documentsPermissions', 'library', 'myDocuments', 'myFavorites', 'lastDocsDistributed', 'folders'];

    for (const table of tables) {
      const result = await db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table]);
      if (result.values && result.values.length > 0) {
        console.log(`Table exists: ${table}`);
      } else {
        console.warn(`Table MISSING: ${table}`);
      }
    }
  }
}
