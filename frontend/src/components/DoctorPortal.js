import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import './DoctorPortal.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const DoctorPortal = ({ contract, accounts, handleLogout }) => {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredInsurance, setRegisteredInsurance] = useState([]);
  const [requestStatus, setRequestStatus] = useState({}); // Track request status for insurance companies
  const [selectedRecordForRequest, setSelectedRecordForRequest] = useState(null); // Track which record is requesting verification

  // Check if the doctor is registered
  const checkDoctorRegistration = useCallback(async () => {
    try {
      const registered = await contract.methods.doctors(accounts[0]).call();
      setIsRegistered(registered);
      console.log(`Doctor registration status: ${registered}`);
    } catch (error) {
      console.error('Error checking doctor registration:', error.message);
    }
  }, [contract, accounts]);

  // Fetch registered insurance companies from the backend
  const fetchRegisteredInsurance = useCallback(async () => {
    try {
      const response = await axios.get(
        'http://localhost:5001/api/insurance',
      );
      if (response.data && response.data.insurance) {
        // Keep original case for display
        setRegisteredInsurance(response.data.insurance);
        console.log('Registered Insurance Companies:', response.data.insurance);
      } else {
        console.warn('No insurance companies found in the response.');
        setRegisteredInsurance([]);
      }
    } catch (error) {
      console.error('Error fetching registered insurance companies:', error.message);
      setRegisteredInsurance([]);
    }
  }, []);

  const extractInsuranceNames = useCallback(textContent => {
    const insuranceCompanies = [];
    let insideInsuranceSection = false;
    let currentInsurance = '';

    textContent.items.forEach(item => {
      const text = item.str.trim();

      if (text.includes('INSURANCE') || text.includes('COVERAGE')) insideInsuranceSection = true;
      if (insideInsuranceSection && text.includes('MEDICATION'))
        insideInsuranceSection = false;

      if (insideInsuranceSection) {
        const isAllCaps = text === text.toUpperCase();
        if (isAllCaps && text !== 'INSURANCE' && text !== 'COVERAGE' && text.length > 1) {
          currentInsurance += ` ${text}`.trim();
        } else if (currentInsurance) {
          insuranceCompanies.push(currentInsurance.trim());
          currentInsurance = '';
        }
      }
    });

    if (currentInsurance) insuranceCompanies.push(currentInsurance.trim());
    return insuranceCompanies;
  }, []);

  const extractTextFromPDF = useCallback(
    async fileUrl => {
      try {
        const pdf = await pdfjsLib.getDocument(fileUrl).promise;
        let insuranceCompanies = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const insuranceFromPage = extractInsuranceNames(content);
          insuranceCompanies = insuranceCompanies.concat(insuranceFromPage);
        }

        return [...new Set(insuranceCompanies)];
      } catch (error) {
        console.error('Error extracting text from PDF:', error.message);
        return [];
      }
    },
    [extractInsuranceNames],
  );

  const fetchMedicalRecords = useCallback(async () => {
    try {
      const events = await contract.getPastEvents('NFTMinted', {
        fromBlock: 0,
        toBlock: 'latest',
      });

      const recordList = await Promise.all(
        events.map(async event => {
          const tokenId = event.returnValues.tokenId;
          const patientAddress = event.returnValues.patient;

          const recordData = await contract.methods
            .getMedicalRecord(patientAddress)
            .call();

          const isVerifiedByDoctor = await contract.methods
            .isVerifiedByDoctor(tokenId)
            .call();

          // Check for existing insurance request
          const requestDetails = await contract.methods
            .getInsuranceRequest(tokenId)
            .call();
          const requestedInsurance = requestDetails[0] || '';
          const isRequested = requestDetails[1] || false;
          
          // Check if verified by insurance
          const isVerifiedByInsurance = await contract.methods
            .isVerifiedByInsurance(tokenId)
            .call();

          // Build insurance status object
          const insuranceStatus = {};
          if (requestedInsurance) {
            insuranceStatus[requestedInsurance.toLowerCase()] = isVerifiedByInsurance;
          }

          return {
            tokenId,
            patientName: recordData[0],
            ipfsHash: recordData[1],
            hospitalName: recordData[2],
            insuranceCompanies: requestedInsurance ? [requestedInsurance] : [],
            insuranceStatus,
            isVerifiedByDoctor,
            requestedInsurance: requestedInsurance || null,
            isVerifiedByInsurance,
          };
        }),
      );

      setMedicalRecords(recordList);
    } catch (error) {
      console.error('Error fetching medical records:', error.message);
    }
  }, [contract]);

  const requestVerification = async (tokenId, insuranceCompanyName) => {
    if (!insuranceCompanyName || insuranceCompanyName.trim() === '') {
      alert('Please select an insurance company.');
      return;
    }

    const insuranceExists = registeredInsurance.some(
      ins => ins.toLowerCase() === insuranceCompanyName.toLowerCase(),
    );

    if (!insuranceExists) {
      alert(`Insurance company "${insuranceCompanyName}" is not registered.`);
      return;
    }

    try {
      // Get the hospital name from the record
      const record = medicalRecords.find(r => r.tokenId === tokenId);
      const doctorName = record ? record.hospitalName : 'Hospital';
      
      await contract.methods
        .requestVerificationByInsurance(
          tokenId,
          insuranceCompanyName,
          doctorName,
        )
        .send({ from: accounts[0] });

      // Update request status
      setRequestStatus(prev => ({
        ...prev,
        [tokenId]: { ...prev[tokenId], [insuranceCompanyName]: 'Requested' },
      }));

      setSelectedRecordForRequest(null); // Close the request form
      alert(`Verification request sent to "${insuranceCompanyName}" successfully.`);
      fetchMedicalRecords(); // Refresh records after request
    } catch (error) {
      console.error('Error requesting verification:', error.message);
      alert(`Failed to request verification: ${error.message}`);
    }
  };

  const verifyRecord = async tokenId => {
    try {
      await contract.methods
        .verifyByDoctor(tokenId)
        .send({ from: accounts[0] });
      alert(`Medical record with Token ID ${tokenId} verified successfully.`);
      fetchMedicalRecords(); // Refresh records after verification
    } catch (error) {
      console.error('Error verifying medical record:', error.message);
      alert('Failed to verify medical record. Make sure insurance has verified it first.');
    }
  };

  useEffect(() => {
    checkDoctorRegistration();
    fetchRegisteredInsurance();
    fetchMedicalRecords();
  }, [checkDoctorRegistration, fetchRegisteredInsurance, fetchMedicalRecords]);

  if (!isRegistered) {
    return (
      <div className="error-message">
        <h2>Registration Required</h2>
        <p>You are not a registered doctor/hospital. Please contact the administrator to register your account on the blockchain.</p>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
          Make sure you registered with MetaMask and the transaction was confirmed.
        </p>
      </div>
    );
  }

  const verifiedCount = medicalRecords.filter(r => r.isVerifiedByDoctor).length;
  const pendingCount = medicalRecords.filter(r => !r.isVerifiedByDoctor).length;

  return (
    <div className="app-container">
      <div className="logout-container">
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
      <div className="doctor-portal">
        <header className="portal-header">
          <h2>Doctor Dashboard</h2>
          <p>Review and verify patient medical records</p>
        </header>

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Records</div>
            <div className="stat-value">{medicalRecords.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Verified</div>
            <div className="stat-value">{verifiedCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Review</div>
            <div className="stat-value">{pendingCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Insurance Companies</div>
            <div className="stat-value">{registeredInsurance.length}</div>
          </div>
        </div>

        <h3>Patient Medical Records</h3>
        {medicalRecords.length === 0 ? (
          <div className="empty-state">
            No medical records found. Patients need to upload their records first.
          </div>
        ) : (
          <div className="records-grid">
            {medicalRecords.map(record => (
              <div key={record.tokenId} className="record-card">
                <div className="record-header">
                  <div className="record-header-item">
                    <strong>Token ID</strong>
                    <span>#{record.tokenId}</span>
                  </div>
                  <div className="record-header-item">
                    <strong>Patient</strong>
                    <span>{record.patientName}</span>
                  </div>
                  <div className="record-header-item">
                    <strong>Hospital</strong>
                    <span>{record.hospitalName}</span>
                  </div>
                </div>
                
                <div className="record-actions">
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-record-link"
                  >
                    View Medical Record
                  </a>
                </div>

                <div className="verification-section">
                  <div className="verification-status">
                    <strong>Doctor Verification</strong>
                    {record.isVerifiedByDoctor ? (
                      <span className="verified-badge">Verified</span>
                    ) : (
                      <button 
                        className="verify-button"
                        onClick={() => verifyRecord(record.tokenId)}
                      >
                        Verify Record
                      </button>
                    )}
                  </div>

                  <div className="insurance-section">
                    <h4>Insurance Verification</h4>
                    {registeredInsurance.length === 0 ? (
                      <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.875rem' }}>
                        No insurance companies registered yet.
                      </p>
                    ) : selectedRecordForRequest === record.tokenId ? (
                      <div className="request-form">
                        <select
                          className="insurance-select"
                          onChange={(e) => {
                            if (e.target.value) {
                              requestVerification(record.tokenId, e.target.value);
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">Select Insurance Company...</option>
                          {registeredInsurance.map((insurance, idx) => {
                            const lowerCaseInsurance = insurance.toLowerCase();
                            const status = requestStatus[record.tokenId]?.[insurance] === 'Requested';
                            const isVerified = record.insuranceStatus?.[lowerCaseInsurance];
                            
                            if (isVerified) {
                              return (
                                <option key={idx} value={insurance} disabled>
                                  {insurance} (Already Verified)
                                </option>
                              );
                            }
                            if (status) {
                              return (
                                <option key={idx} value={insurance} disabled>
                                  {insurance} (Request Pending)
                                </option>
                              );
                            }
                            return (
                              <option key={idx} value={insurance}>
                                {insurance}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          className="cancel-request-button"
                          onClick={() => setSelectedRecordForRequest(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="insurance-actions">
                        <button
                          className="request-verification-button"
                          onClick={() => setSelectedRecordForRequest(record.tokenId)}
                        >
                          Request Insurance Verification
                        </button>
                        {record.insuranceCompanies && record.insuranceCompanies.length > 0 && (
                          <ul className="insurance-status-list">
                            {record.insuranceCompanies.map((insurance, index) => {
                              const lowerCaseInsurance = insurance.toLowerCase();
                              const isVerified = record.insuranceStatus?.[lowerCaseInsurance];
                              const status = requestStatus[record.tokenId]?.[insurance] === 'Requested';
                              
                              return (
                                <li key={index} className="insurance-status-item">
                                  <span>{insurance}</span>
                                  {isVerified ? (
                                    <span className="verified-badge">Verified</span>
                                  ) : status ? (
                                    <span className="requested-badge">Pending</span>
                                  ) : (
                                    <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>Not Requested</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorPortal;
